import json
import os
import pandas as pd
from dotenv import load_dotenv
import openai
from openai import OpenAI
from pydantic import BaseModel
from typing import List, Literal, Optional
from sklearn.preprocessing import LabelEncoder
from sklearn.feature_selection import mutual_info_classif
from sqlalchemy import inspect
from ..models import Destination

client = OpenAI()
load_dotenv('..')
openai.api_key = os.environ['OPENAI_API_KEY']


class DynamicFilter(BaseModel):
    question: str
    feature: str
    type: Literal["binary", "categorical"]
    values: List[str]
    value_meanings: Optional[dict[str, str]]


class DynamicFilterGenerator:
    top_n_features = 5

    feature_cols = [
        "Day trip", "Long trip", "Short trip", "One week", "Weekend",
        "culture", "adventure", "nature", "beaches", "nightlife",
        "cuisine", "wellness", "urban", "seclusion",
        "region_enc", "budget_level_enc"
    ]

    def __init__(self):
        pass

    def measure_information_gain(self, dataframe):
        df = dataframe.copy()

        # Fit LabelEncoders for categorical features
        le_budget = LabelEncoder()
        le_region = LabelEncoder()

        df["budget_level_enc"] = le_budget.fit_transform(df["budget_level"])
        df["region_enc"] = le_region.fit_transform(df["region"])

        # Map encoders
        label_encoders = {
            "budget_level_enc": le_budget,
            "region_enc": le_region,
        }

        X = df[self.feature_cols]
        y = df["label"]
        selected = df[df["label"] == 1]

        info_gains = mutual_info_classif(X, y, discrete_features='auto')

        # Generate readable unique values
        unique_values = []
        for col in self.feature_cols:
            values = selected[col].unique()
            if col in label_encoders:
                encoder = label_encoders[col]
                decoded = encoder.inverse_transform(values)
                unique_values.append(list(decoded))
            else:
                # Keep raw values for binary or numeric features
                unique_values.append(list(values))

        # Build final result
        gain_df = pd.DataFrame({
            "feature": self.feature_cols,
            "info_gain": info_gains,
            "unique_values": unique_values
        })

        gain_df = gain_df.sort_values(by="info_gain", ascending=False)
        return gain_df.head(self.top_n_features)

    def format_features_as_string(self, top_features_df):
        features = []
        for _, row in top_features_df.iterrows():
            feature = row["feature"]
            values = row["unique_values"]
            features.append(f"Feature name:'{feature}'. Feature values: {values}")
        return features

    def generate_filters_via_openai(self, top_features_df):
        feature_info = self.format_features_as_string(top_features_df)

        prompt_template = """
        You are a travel assistant that creates filter questions for a travel destination recommendation system.
        
        Each feature in the dataset has a list of unique values:
        - Some features are binary (e.g., [0, 1]) and represent yes/no preferences.
        - Others are categorical with multiple values (e.g., [1, 2, 3, 4, 5]), representing intensity or levels of interest.
        
        Your task:
        1. Identify the type of each feature (`binary` or `categorical`).
        2. For each, create a meaningful **filter question** in natural language.
        3. For binary: map 0 → No, 1 → Yes
        4. For categorical: assume values range from 1 (low) to 5 (high) and explain meanings if possible.
        5. Define the value_meanings in the following format: "1: 'Minimal seclusion', 2: 'Some seclusion', 3: 'Moderate seclusion', 4: 'High seclusion', 5: 'Very high seclusion'"
        6. Return 5 filters.
        
        Here are the features and their relevant values:
        {feature_info}
        
        You must output a list of JSON-like objects using the exact structure below, one per feature.
        
        Do not include any extra text, explanations, or commentary.
        
        Each object must include all the following fields and **no field can be null or missing**:
        
        - feature_name (str): The name of the feature.
        - value_meanings (dict[str, str]): A mapping of each unique feature value to a human-readable description. You must provide a description for each value - they must never be 'None', empty, or partially filled.
        
        Respond strictly with a JSON array of objects matching this format.
        """

        messages = [
            {
                "role": "system",
                "content": "You are a travel assistant helping users select destinations. Based on the most "
                           "informative features and their values from a filtered dataset, generate 5 dynamic filters "
                           "in JSON format to help users refine their choices. Return exactly 5 filter suggestions in "
                           "JSON format under a `filters` field.",
            },
            {
                "role": "user",
                "content": prompt_template.format(feature_info=feature_info)
            },
        ]

        response = client.responses.parse(
            model="gpt-4o-mini",
            temperature=0.8,
            input=messages,
            text_format=list[DynamicFilter]
        )

        filters = response.output_parsed.filters

        return filters

    def convert_data_into_dataframe(self, selected_destinations):
        # Create the destinations list
        if hasattr(selected_destinations, 'all'):
            selected_destinations = selected_destinations.all()

        # Convert each Destination instance to a dict
        records = []
        for dest in selected_destinations:
            row = {}
            column_collection = inspect(Destination).columns
            for col in column_collection:
                value = getattr(dest, col.name)
                # parse the JSON-string column
                if col.name == 'avg_temp_monthly' and isinstance(value, str):
                    try:
                        value = json.loads(value)
                    except json.JSONDecodeError:
                        pass
                row[col.name] = value
            records.append(row)

        # Create DataFrame
        df = pd.DataFrame(records)

        return df

    def generate_dynamic_filters(self, selected_destinations):
        selected_destinations = self.convert_data_into_dataframe(selected_destinations)
        top_features_df = self.measure_information_gain(selected_destinations)
        dynamic_filters = self.generate_filters_via_openai(top_features_df)

        return dynamic_filters
