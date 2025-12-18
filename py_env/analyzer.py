"""
CEFR Level Analyzer for EPUB Text Content

This script analyzes text content and categorizes vocabulary by CEFR level (A1-C2).
It uses spaCy for tokenization, lemmatization, and named entity recognition.

Usage:
    python analyzer.py <input_text_file> [--cefr <cefr_csv_path>]

Output:
    JSON object with CEFR level distribution and statistics
"""

import sys
import json
import csv
import argparse
from pathlib import Path
from collections import Counter
from typing import Dict, Set, Tuple

import spacy


def load_cefr_dictionary(csv_path: str) -> Dict[str, str]:
    """
    Load CEFR vocabulary from CSV file.
    
    Args:
        csv_path: Path to the CEFR vocabulary CSV file
        
    Returns:
        Dictionary mapping lowercased word to CEFR level (A1, A2, B1, B2, C1, C2)
    """
    cefr_dict: Dict[str, str] = {}
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            word = row['headword'].lower().strip()
            level = row['CEFR'].strip().upper()
            
            # Handle words with multiple forms (e.g., "a.m./A.M./am/AM")
            if '/' in word:
                for variant in word.split('/'):
                    variant = variant.strip()
                    if variant and level:
                        # Keep the first (usually easiest) level if word appears multiple times
                        if variant not in cefr_dict:
                            cefr_dict[variant] = level
            else:
                if word and level:
                    if word not in cefr_dict:
                        cefr_dict[word] = level
    
    return cefr_dict


def analyze_text(
    text: str, 
    cefr_dict: Dict[str, str], 
    nlp
) -> Dict:
    """
    Analyze text and return CEFR level distribution.
    
    Args:
        text: Input text to analyze
        cefr_dict: CEFR vocabulary dictionary
        nlp: spaCy language model
        
    Returns:
        Analysis result dictionary
    """
    doc = nlp(text)
    
    # Collect all valid tokens (exclude punctuation, spaces, numbers, and named entities)
    # Also collect their lemmas for lookup
    word_lemma_pairs: list[Tuple[str, str]] = []
    
    # Get all named entities (people, places, organizations, etc.)
    named_entity_tokens: Set[int] = set()
    for ent in doc.ents:
        if ent.label_ in ('PERSON', 'GPE', 'ORG', 'LOC', 'FAC', 'NORP', 'EVENT'):
            for token in ent:
                named_entity_tokens.add(token.i)
    
    for token in doc:
        # Skip if:
        # - It's punctuation or space
        # - It's a number
        # - It's a named entity
        # - It's too short (single character except 'a', 'I')
        if (token.is_punct or 
            token.is_space or 
            token.is_digit or 
            token.like_num or
            token.i in named_entity_tokens):
            continue
            
        # Get the lemma (lowercase)
        lemma = token.lemma_.lower().strip()
        original = token.text.lower().strip()
        
        # Skip very short words (except common ones)
        if len(lemma) < 2 and lemma not in ('a', 'i'):
            continue
            
        # Skip if lemma is just punctuation or empty
        if not lemma or not lemma.isalpha():
            continue
            
        word_lemma_pairs.append((original, lemma))
    
    # Count CEFR levels
    level_counts: Counter = Counter()
    unknown_words: Set[str] = set()
    known_words: Dict[str, Set[str]] = {
        'A1': set(), 'A2': set(), 'B1': set(), 'B2': set(), 'C1': set(), 'C2': set()
    }
    
    total_words = len(word_lemma_pairs)
    unique_lemmas: Set[str] = set()
    
    for original, lemma in word_lemma_pairs:
        unique_lemmas.add(lemma)
        
        # Try to find CEFR level - first by lemma, then by original word
        level = cefr_dict.get(lemma) or cefr_dict.get(original)
        
        if level and level in known_words:
            level_counts[level] += 1
            known_words[level].add(lemma)
        else:
            level_counts['Unknown'] += 1
            unknown_words.add(lemma)
    
    # Calculate percentages
    distribution = {}
    for level in ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Unknown']:
        count = level_counts.get(level, 0)
        percentage = round((count / total_words * 100), 2) if total_words > 0 else 0
        distribution[level] = {
            'count': count,
            'percentage': percentage,
            'uniqueWords': len(known_words.get(level, set())) if level != 'Unknown' else len(unknown_words)
        }
    
    # Calculate difficulty score (weighted average of levels)
    level_weights = {'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6}
    weighted_sum = sum(level_counts.get(level, 0) * weight 
                       for level, weight in level_weights.items())
    known_word_count = total_words - level_counts.get('Unknown', 0)
    difficulty_score = round(weighted_sum / known_word_count, 2) if known_word_count > 0 else 0
    
    # Determine primary level based on difficulty score
    if difficulty_score < 1.5:
        primary_level = 'A1'
    elif difficulty_score < 2.5:
        primary_level = 'A2'
    elif difficulty_score < 3.5:
        primary_level = 'B1'
    elif difficulty_score < 4.5:
        primary_level = 'B2'
    elif difficulty_score < 5.5:
        primary_level = 'C1'
    else:
        primary_level = 'C2'
    
    return {
        'totalWords': total_words,
        'uniqueWords': len(unique_lemmas),
        'knownWordsCount': known_word_count,
        'unknownWordsCount': level_counts.get('Unknown', 0),
        'unknownWordsRatio': round((level_counts.get('Unknown', 0) / total_words * 100), 2) if total_words > 0 else 0,
        'distribution': distribution,
        'difficultyScore': difficulty_score,
        'primaryLevel': primary_level,
        'sampleUnknownWords': sorted(list(unknown_words))[:50]  # Top 50 unknown words
    }


def main():
    # Ensure UTF-8 output on Windows
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    parser = argparse.ArgumentParser(
        description='Analyze text content for CEFR vocabulary levels'
    )
    parser.add_argument(
        'input_file',
        help='Path to the input text file'
    )
    parser.add_argument(
        '--cefr',
        default=None,
        help='Path to CEFR vocabulary CSV file (default: look in resources folder)'
    )
    
    args = parser.parse_args()
    
    # Determine CEFR file path
    if args.cefr:
        cefr_path = args.cefr
    else:
        # Look for the file relative to script location or in common locations
        script_dir = Path(__file__).parent.resolve()
        possible_paths = [
            script_dir.parent / 'resources' / 'cefrj-vocabulary-profile-1.5.csv',
            script_dir / 'resources' / 'cefrj-vocabulary-profile-1.5.csv',
            Path('resources') / 'cefrj-vocabulary-profile-1.5.csv',
        ]
        
        cefr_path = None
        for path in possible_paths:
            if path.exists():
                cefr_path = str(path)
                break
        
        if not cefr_path:
            print(json.dumps({
                'error': 'CEFR vocabulary file not found. Please specify with --cefr option.'
            }))
            sys.exit(1)
    
    # Load CEFR dictionary
    try:
        cefr_dict = load_cefr_dictionary(cefr_path)
    except Exception as e:
        print(json.dumps({'error': f'Failed to load CEFR dictionary: {str(e)}'}))
        sys.exit(1)
    
    # Load spaCy model
    # Support both development and PyInstaller bundled environments
    nlp = None
    
    # Try loading from PyInstaller bundle first
    if getattr(sys, 'frozen', False):
        # Running as bundled exe
        bundle_dir = Path(sys._MEIPASS)  # type: ignore
        model_path = bundle_dir / 'en_core_web_sm' / 'en_core_web_sm-3.8.0'
        if model_path.exists():
            try:
                nlp = spacy.load(str(model_path))
            except Exception:
                pass
        
        # Also try the direct model path
        if nlp is None:
            model_path2 = bundle_dir / 'en_core_web_sm'
            if model_path2.exists():
                try:
                    nlp = spacy.load(str(model_path2))
                except Exception:
                    pass
    
    # Fall back to standard loading
    if nlp is None:
        try:
            nlp = spacy.load('en_core_web_sm')
        except OSError:
            print(json.dumps({'error': 'spaCy model en_core_web_sm not found. Run: python -m spacy download en_core_web_sm'}))
            sys.exit(1)
    
    # Read input file
    try:
        with open(args.input_file, 'r', encoding='utf-8') as f:
            text = f.read()
    except Exception as e:
        print(json.dumps({'error': f'Failed to read input file: {str(e)}'}))
        sys.exit(1)
    
    # Analyze text
    result = analyze_text(text, cefr_dict, nlp)
    result['cefrDictionarySize'] = len(cefr_dict)
    
    # Output JSON result
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
