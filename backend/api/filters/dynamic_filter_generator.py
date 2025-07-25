import json
import os
import pandas as pd
from dotenv import load_dotenv
import openai
from openai import OpenAI
from pydantic import BaseModel
from typing import List, Literal, Optional
from sqlalchemy import inspect
from ..models import Destination
import numpy as np
from math import e

client = OpenAI()
load_dotenv('..')
openai.api_key = os.environ['OPENAI_API_KEY']


class DynamicFilter(BaseModel):
    question: str
    feature: str
    type: Literal["binary", "categorical"]
    value_meanings: Optional[dict[str, str]]


class DynamicFilterList(BaseModel):
    filter_list: List[DynamicFilter]


class DynamicFilterGenerator:
    top_n_features = 5

    feature_cols = [
        "day_trip", "long_trip", "short_trip", "one_week", "weekend",
        "culture", "adventure", "nature", "beaches", "nightlife",
        "cuisine", "wellness", "urban", "seclusion",
        "region_enc", "budget_level_enc"
    ]

    def __init__(self):
        pass

    def format_features_as_string(self, top_features_df):
        features = []
        for feature_name, row in top_features_df.iterrows():
            values = row["unique_values"]
            features.append(f"Feature name: '{feature_name}'. Feature values: {values}")
        return features

    def generate_filters_via_openai(self, top_features_df):
        feature_info = self.format_features_as_string(top_features_df)

        prompt_template = """
        You are a travel assistant that creates filter questions for a travel destinations recommendation system.
        
        Each feature in the dataset has a list of unique values:
        - Some features are binary (e.g., [0, 1]) and represent yes/no preferences.
        - Others are categorical with multiple values (e.g., [1, 2, 3, 4, 5]), representing intensity or levels of interest.
        
        Your task:
        1. Identify the type of each feature (`binary` or `categorical`).
        2. For each, create a meaningful **filter question** in natural language.
        3. For binary: map 0 → No, 1 → Yes
        4. For categorical: assume values range from 1 (low) to 5 (high) and explain meanings if possible.
        5. Define the value_meanings in the following format, for example for "seclusion": "1: 'Minimal seclusion', 2: 'Some seclusion', 3: 'Moderate seclusion', 4: 'High seclusion', 5: 'Very high seclusion'"
        6. Return filters.
        
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
                           "informative features and their values from a filtered dataset, generate dynamic filters "
                           "in JSON format to help users refine their choices. Return filter suggestions in "
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
            text_format=DynamicFilterList
        )

        filters = response.output_parsed.filter_list

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
        sorted_entropies = self.calculate_column_entropies(selected_destinations)
        dynamic_filters = self.generate_filters_via_openai(sorted_entropies)

        return dynamic_filters

    def pandas_entropy(self, column, base=None):
        vc = pd.Series(column).value_counts(normalize=True, sort=False)
        base = e if base is None else base
        return -(vc * np.log(vc) / np.log(base)).sum()

    def calculate_column_entropies(self, df, base=None):
        df_to_analyse = df.copy()
        columns_to_remove = [
            "id", "short_description", "city", "country",
            "longitude", "latitude", "avg_temp_monthly"
        ]
        df_to_analyse.drop(columns_to_remove, axis='columns', inplace=True, errors='ignore')

        entropies = {col: self.pandas_entropy(df_to_analyse[col], base=base) for col in df_to_analyse.columns}
        unique_values = {col: sorted(df_to_analyse[col].unique().tolist()) for col in df_to_analyse.columns}

        result_df = pd.DataFrame({
            "entropy": entropies,
            "unique_values": unique_values
        })

        return result_df.sort_values(by="entropy", ascending=False).head(self.top_n_features)
