#!/usr/bin/env python3
"""
Check Excel file structure
"""

import pandas as pd

excel_path = r"C:\Users\suppo\Desktop\100 song with Paths.xlsx"

try:
    df = pd.read_excel(excel_path)
    print(f"Excel shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")
    print("\nFirst 5 rows:")
    print(df.head())
    
    # Check if first column contains file paths
    first_col = df.iloc[:, 0]
    print(f"\nFirst column name: {df.columns[0]}")
    print("Sample values from first column:")
    for i, val in enumerate(first_col.head()):
        print(f"  {i}: {val}")
        
except Exception as e:
    print(f"Error: {e}")