# Exercise Feature Implementation Plan

## Goal
Implement the "Exercise" (锻炼) feature, enabling users to review words using Spaced Repetition (SRS) and various practice modes.

## User Review Required
> [!IMPORTANT]
> I will implement a basic SRS algorithm (similar to SM-2). Words will have `nextReviewAt` updated based on user feedback (Easy/Good/Hard/Again).
> "Daily Review Count" will be calculated based on `lastReviewedAt` or a dynamically calculated count of words reviewed today if I add that field.

## Proposed Changes

### Logic & Data Layer
#### [MODIFY] [WordStore.ts](file:///f:/equb_English_learning/windows/src/services/WordStore.ts)
- Add `lastReviewedAt: number` to `Word` interface.
- Add `reviewCount: number` (times reviewed correctly) to `Word` interface.
- Add `easeFactor: number` (for SRS) to `Word` interface (default 2.5).
- Add `interval: number` (days until next review) to `Word` interface.
- Implement `getDueWords()` method to fetch words where `nextReviewAt <= Date.now()`.
- Implement `submitReview(wordId, quality)` method to update SRS fields (`quality` 0-5). 
    - Logic (SM-2 simplified):
        - If quality < 3: Interval = 1, EaseFactor unchanged (or decreased slightly).
        - If quality >= 3: Interval calculated based on previous interval * easeFactor.
        - Update `nextReviewAt` = now + interval * day.
- Update `getStats` to return `dueCount` and `reviewedToday`.

### UI Components

#### [MODIFY] [ExerciseHub.tsx](file:///f:/equb_English_learning/windows/src/pages/Exercise/ExerciseHub.tsx)
- Fetch real stats (`dueCount` for Mixed Practice hero card).
- Fetch real stats for "Exercise Statistics" section (implement lines 80-82 of task.md).
- Navigate to specific routes on click (e.g., `/exercise/session/mixed` or `/exercise/session/flashcard`).

#### [MODIFY] [src/pages/Exercise/ExerciseSession.tsx](file:///f:/equb_English_learning/windows/src/pages/Exercise/ExerciseSession.tsx)
- Enhance `mixed` mode logic to include `SpellingMode`.
- Ensure proper fallback if `SpellingMode` is too difficult for new words (optional).

#### [NEW] [src/pages/Exercise/modes/SpellingMode.tsx](file:///f:/equb_English_learning/windows/src/pages/Exercise/modes/SpellingMode.tsx)
- UI: Audio/Definition prompt.
- Interaction: Input field or character tiles to spell the word.
- Validation: Check spelling against `word.text`.
- Feedback: Success/Failure animations.

#### [NEW] [src/pages/Exercise/modes/FlashcardMode.tsx](file:///f:/equb_English_learning/windows/src/pages/Exercise/modes/FlashcardMode.tsx)
- UI: Card front (Word), Back (Definition + Context).
- Interaction: "Show Answer" -> "Rating Buttons" (Again, Hard, Good, Easy).

#### [NEW] [src/pages/Exercise/modes/ChoiceMode.tsx](file:///f:/equb_English_learning/windows/src/pages/Exercise/modes/ChoiceMode.tsx)
- UI: Question (Definition/Audio), Options (4 words).
- Interaction: Select option -> Feedback (Correct/Wrong) -> Auto advance.

#### [MODIFY] [App.tsx](file:///f:/equb_English_learning/windows/src/App.tsx)
- Add routes:
    - `/exercise/session/:mode` (mode: 'mixed', 'flashcard', 'choice', 'spelling')

## Verification Plan

### Automated Tests
- **[NEW] WordStore SRS Logic**:
    - Add to `src/services/__tests__/WordStore.test.ts`:
        - Test `submitReview` updates `nextReviewAt` and `interval` correctly.
        - Test `getDueWords` returns correct words.
- **Integration**:
    - Verify `ExerciseHub` loads and works without crashing.

### Manual Verification
1. **Stats**: Check if `ExerciseHub` shows "0" (or correct number) for reviews.
2. **Review Flow**:
    - Add a few words.
    - Go to Exercise Hub -> "Mixed Practice".
    - Complete a review session.
    - Verify words are no longer "Due" immediately.
    - Verify "Review Count" increments.