import json

with open('time_sig_progress.json', 'r') as f:
    data = json.load(f)

results = data['results']

sig_4 = [r for r in results if r.get('timeSignature') == '4/4']
sig_3 = [r for r in results if r.get('timeSignature') == '3/4']
sig_6 = [r for r in results if r.get('timeSignature') == '6/8']
errors = [r for r in results if 'error' in r]

print('\n' + '='*60)
print('TIME SIGNATURE ANALYSIS')
print(f'Analyzed: {len(results)}/905 files')
print('='*60)
print(f'\n4/4 Time: {len(sig_4)} tracks ({len(sig_4)/len(results)*100:.1f}%)')
print(f'3/4 Time: {len(sig_3)} tracks ({len(sig_3)/len(results)*100:.1f}%)')
print(f'6/8 Time: {len(sig_6)} tracks ({len(sig_6)/len(results)*100:.1f}%)')
print(f'Errors:   {len(errors)} tracks')

non_4_4 = sig_3 + sig_6
print(f'\n{"="*60}')
print(f'NON-4/4 TRACKS: {len(non_4_4)} total')
print('='*60)

for r in sorted(non_4_4, key=lambda x: x.get('confidence', 0), reverse=True):
    conf = r.get('confidence', 0)
    print(f"  {r['timeSignature']:4} | {conf:4.0%} | {r['file']}")

# High confidence non-4/4
high_conf = [r for r in non_4_4 if r.get('confidence', 0) > 0.6]
print(f'\n{"="*60}')
print(f'HIGH CONFIDENCE NON-4/4: {len(high_conf)} tracks')
print('='*60)
for r in high_conf:
    print(f"  {r['timeSignature']:4} | {r.get('confidence', 0):4.0%} | {r['file']}")
