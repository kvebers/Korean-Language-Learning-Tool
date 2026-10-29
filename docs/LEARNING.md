# How the games teach (and the research behind it)

A short summary of the learning-science findings the tool is built on, and where each one shows up.

| Finding | What it says | Where it is used |
| --- | --- | --- |
| **Spaced repetition** | Reviews spread out over time beat the same amount of massed practice. A meta-analysis of 29 studies found spaced retrieval clearly ahead of massed retrieval (g ≈ 0.74) [1]; reviews of L2 vocabulary studies report gains in retention and motivation, with optimal schedules still debated [2]. | Every letter, syllable, word and grammar point has its own review schedule (`shared/progress.js`): 10 min → 1 day → 3 → 7 → 16 → 35 → 90 → 180 days. Answers given before an item is due don't move it up. |
| **Enough repetitions first, then spacing** | A large study of 1,589 learners found spacing only pays off once learners have had enough repetitions; harder items need more practice before they're spaced out [3]. | New words get several back-to-back retrievals in their first round (recognise → hear → recall), and a word must be right **3 times in a row** before it counts as learned and helps unlock more words. A mistake brings an item back in 10 minutes. |
| **Retrieval practice (the testing effect)** | Recalling an answer strengthens memory more than re-reading it. Spaced *retrieval* in particular improves retention and transfer of foreign vocabulary [4]. | Every game asks you to produce or pick the answer rather than just look at it. Hints are allowed but marked "assisted" and don't count. |
| **Receptive vs productive knowledge** | Recognising a word (Korean → meaning) is easier and learned earlier than producing it (meaning → Korean); both need practice [5]. | Answers are tagged by skill (recognition, recall, listening, speaking, writing) and the progress page shows accuracy for each. New Words always ends with recall. |
| **Dual coding** | Words linked to a picture and a sound are remembered better than words alone [6]. | Words have emoji pictures where possible; every Korean word can be heard (text-to-speech). Fridge Raid and Daily Routine are built around pictures and actions. |
| **Semantic grouping** | Organising words by meaning (topic webs) helps retrieval. (Very similar *new* words taught together can interfere, so mixed review is used too.) | Word Web; topics in the library. Other games mix topics. |
| **Gradual load** | A small active set that grows as it is mastered keeps practice focused. | Vocabulary starts with 20 words; the next 10 unlock once all but 20% of the unlocked words are learned. |
| **Automaticity** | Fast, timed recognition turns slow translation into instant recognition, but it works on words you already know, not new ones. | Word Match "Speed" mode only uses words you've already met; "Relaxed" mode is for learning. |

## Possible next steps

- Replace the fixed Leitner intervals with **FSRS** (Free Spaced Repetition Scheduler), which models each item's stability and difficulty and is what modern Anki uses.
- Per-skill schedules (a word can be easy to recognise but hard to recall).

## Sources

1. Spaced vs massed retrieval meta-analysis (29 studies). https://ifp.nyu.edu/?p=1511228
2. *Spaced repetition for vocabulary retention in EFL and ESL learning: A systematic literature review* (2025). https://riset.unisma.ac.id/index.php/JREALL/article/view/25562
3. Repetition vs spacing in L2 vocabulary learning (1,589 participants). https://escholarship.org/uc/item/61p4p686
4. *Spaced Retrieval Improves Retention and Transfer of Foreign Vocabulary.* https://uta-ir.tdl.org/uta-ir/handle/10106/31392
5. Nation, I. S. P. *Learning Vocabulary in Another Language* (Cambridge University Press), receptive and productive knowledge.
6. Paivio, A. *Mental Representations: A Dual Coding Approach* (Oxford University Press, 1986).
