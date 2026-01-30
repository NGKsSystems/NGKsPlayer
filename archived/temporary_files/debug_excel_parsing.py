import pandas as pd
import os

# Test Excel parsing logic
excel_path = r'C:\Users\suppo\Desktop\5 song with Paths.xlsx'

print('=== DEBUGGING EXCEL PARSING ===')

# Read with different approaches
print('\n1. Default read_excel():')
df1 = pd.read_excel(excel_path)
print(f'Shape: {df1.shape}')
print(f'Columns: {list(df1.columns)}')
print('First column values:')
for i, val in enumerate(df1.iloc[:, 0]):
    print(f'  {i}: {val}')

print('\n2. read_excel with header=None:')
df2 = pd.read_excel(excel_path, header=None)
print(f'Shape: {df2.shape}')
print('First column values:')
for i, val in enumerate(df2.iloc[:, 0]):
    print(f'  {i}: {val}')

print('\n3. Current analyzer logic simulation:')
df = pd.read_excel(excel_path)
file_paths = df.iloc[:, 0].dropna().tolist()
print(f'Raw file_paths: {len(file_paths)} items')
for i, path in enumerate(file_paths):
    print(f'  {i}: {path}')

print('\n4. Filter for audio files:')
audio_extensions = ['.mp3', '.wav', '.flac', '.m4a']
valid_files = []
for path in file_paths:
    path_str = str(path).strip()
    if any(path_str.lower().endswith(ext) for ext in audio_extensions):
        if os.path.exists(path_str):
            valid_files.append(path_str)
            print(f'  VALID: {path_str}')
        else:
            print(f'  MISSING: {path_str}')
    else:
        print(f'  NOT AUDIO: {path_str}')

print(f'\nFinal valid files: {len(valid_files)}')