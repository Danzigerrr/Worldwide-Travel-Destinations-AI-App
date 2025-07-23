# data_loader.py
import pandas as pd
import os
from sqlalchemy.orm import Session
from .api.models import Destination
from .api.database import SessionLocal, Base, engine


class DataLoader:
    @staticmethod
    def load_csv(path: str) -> pd.DataFrame:
        """
        Load a CSV file into a pandas DataFrame.
        
        - Casts specific columns to boolean types.
        - Renames columns to match model attribute names.
        
        Args:
            path (str): The file path to the CSV file.
        
        Returns:
            pd.DataFrame: The processed DataFrame.
        """
        df = pd.read_csv(path, index_col=0)
        # Cast trip-flag columns to boolean types
        bool_cols = ['Day trip', 'Long trip', 'One week', 'Short trip', 'Weekend']
        for col in bool_cols:
            if col in df.columns:
                df[col] = df[col].astype(bool)
        # Rename to match model attribute names
        df = df.rename(columns={
            'Day trip': 'day_trip', 'Long trip': 'long_trip',
            'One week': 'one_week', 'Short trip': 'short_trip',
            'Weekend': 'weekend'
        })
        return df

    def populate_db(self, db: Session, df: pd.DataFrame) -> None:
        """
        Insert rows from DataFrame into the database using ORM.
        Skips rows already present to ensure idempotency.
        """
        for record in df.to_dict(orient='records'):
            if not db.query(Destination).filter_by(id=record['id']).first():
                dest = Destination(**record)
                db.add(dest)
        db.commit()
        print(f"✓ Populated {len(df)} records")


def populate_the_database():
    """Main entrypoint: create tables and populate DB."""
    # Ensure the table exists
    Base.metadata.create_all(bind=engine)
    # CSV path (adjust if needed)
    csv_path = os.path.join(os.path.dirname(__file__), 'structured_data.csv')
    print(f"Loading CSV data from: {csv_path}")
    df = DataLoader.load_csv(csv_path)

    db = SessionLocal()
    try:
        DataLoader.populate_db(db, df)
    except Exception as e:
        print(f"Error populating database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    populate_the_database()
