"""Test script to verify analyzer output"""
import json
from pathlib import Path

# Import from analyzer
from analyzer import load_cefr_dictionary, analyze_text
import spacy

# Load CEFR dict
cefr_path = Path('../resources/cefrj-vocabulary-profile-1.5.csv')
cefr_dict = load_cefr_dictionary(str(cefr_path))
print(f"✅ Loaded {len(cefr_dict)} words from CEFR dictionary")

# Load spaCy
nlp = spacy.load('en_core_web_sm')
print("✅ spaCy model loaded")

# Test text
text = """The quick brown fox jumps over the lazy dog. I am a student. 
John Smith went to New York. Learning vocabulary is important for communication.
The comprehensive analysis reveals fascinating patterns."""

# Analyze
result = analyze_text(text, cefr_dict, nlp)

# Print key metrics
print(f"\n📊 Analysis Results:")
print(f"   Total words: {result['totalWords']}")
print(f"   Unique words: {result['uniqueWords']}")
print(f"   Known words: {result['knownWordsCount']}")
print(f"   Unknown words: {result['unknownWordsCount']} ({result['unknownWordsRatio']}%)")
print(f"   Difficulty score: {result['difficultyScore']}")
print(f"   Primary level: {result['primaryLevel']}")

print(f"\n📈 CEFR Distribution:")
for level in ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Unknown']:
    data = result['distribution'][level]
    bar = '█' * int(data['percentage'] / 5) if data['percentage'] > 0 else ''
    print(f"   {level}: {data['count']:3d} words ({data['percentage']:5.1f}%) {bar}")

print(f"\n🔍 Sample unknown words: {result['sampleUnknownWords'][:10]}")

# Save full result
with open('test_result.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print(f"\n✅ Full result saved to test_result.json")
