# Paper → blog post

Paste this into Cowork with the paper attached. Fill in the two lines at the top
and delete the rest of this header.

Keep the tag list in step 4 in sync with the site vocabularies. If a tag is added
through the dashboard, add it here too, or this prompt will keep proposing the
old set.

---

```
Convert the attached paper into a finished blog post for one of my Chronicles
sites. I will paste your output straight into my publishing dashboard, so follow
the output format exactly.

SITE: [War Chronicles | Waterline Chronicles | Captain's Cellar | Chronicle of Fear]
AUDIENCE NOTE: [anything specific about who this piece is for — delete if none]

## 1. Read it properly first

Read the whole paper before writing anything. Identify:
- the actual argument (not the topic — the claim it is making)
- the two or three pieces of evidence doing the real work
- anything that would only make sense to someone who read the assignment prompt

## 2. Use my brand voice

Load the voice-packs skill and write in the voice for the SITE above. If
voice-packs is unavailable, say so and match the tone of the paper's strongest
passage rather than inventing a house style.

## 3. Convert it — this is a rewrite, not a reformat

An academic paper and a blog post fail in opposite directions. Apply all of these:

- **Move the argument to the top.** Academic papers build to the thesis; a blog
  post opens with it. The first two sentences must carry the claim and a reason
  to keep reading. If the paper's best line is buried on page four, that is
  usually the opening.
- **Cut the scaffolding.** Delete "This paper will argue," "As discussed above,"
  "In conclusion," section numbering, and any restatement of the prompt.
- **Break the prose up.** Paragraphs of three to five sentences. A subheading
  (`##`) roughly every 300–400 words, worded as a statement rather than a label —
  "Schlieffen ignored the enemy's vote," not "Analysis."
- **Keep the specifics, cut the hedging.** Dates, numbers, names, and units stay.
  "It could be argued that" goes.
- **Preserve every citation.** Do not silently drop a source. Convert footnotes
  and endnotes into a `## Sources` section at the end, as a markdown list. Where
  a claim leans on one source, keep the attribution in the sentence itself
  ("Keegan puts the figure at…").
- **Change no facts.** If something in the paper is unclear or looks wrong, leave
  it as written and flag it under NOTES at the end of your output. Do not fix it
  silently and do not add facts the paper does not contain.

Target length: 900–1,500 words unless the paper is substantially shorter.

## 4. Pick the metadata from these fixed lists

Category — exactly one, and it must come from the SITE's list:
- War Chronicles: history, leadership, campaigns, biographies, doctrine, journal
- Waterline Chronicles: maritime, rivers, boats, places, stories, journal
- Captain's Cellar: history, spirits, cigars, pipes, pairings, journal
- Chronicle of Fear: folklore, myth, ghost-stories, field-notes, case-files, journal

Tags — choose only from the SITE's existing vocabulary. Prefer two to five.
If nothing fits, return an empty list rather than inventing one; if you think a
genuinely new tag is warranted, put it under NOTES and explain why instead of
using it.

- War Chronicles: world-war-i, world-war-ii, vietnam, korea, american-civil-war,
  queen-annes-war, pacific-theater, western-front, european-theater,
  united-states-marine-corps, united-states-army, united-states-navy, anzac,
  american-expeditionary-forces, air-power, air-mobility, naval-warfare,
  amphibious-warfare, counterinsurgency, electronic-warfare, ancient-warfare,
  colonial-warfare, last-stand, leadership, doctrine, siege, urban-warfare
- Waterline Chronicles: wetlands, birds, science, sharks
- Captain's Cellar: cellar-journal
- Chronicle of Fear: louisiana, florida, new-orleans, civil-war, mississippi,
  vicksburg, the-chroniclers-tales

Do not tag a post with a word that merely repeats its category. The category
already says what kind of piece it is; a tag should name a place, a person, a
conflict, or a subject.

## 5. Output in exactly this shape

Give me these six blocks, in this order, with nothing else between them. No
preamble, no "here's your post."

TITLE:
(one line, under 70 characters, no subtitle after a colon)

DESCRIPTION:
(one or two sentences, under 40 words, written to make someone click — this
appears on the site's front page and in the newsletter)

CATEGORY:
(one word from the list above)

TAGS:
(comma separated on one line, lowercase, hyphens instead of spaces)

HERO ALT:
(one sentence describing an image that would suit the piece — I will use this
if I add a hero image)

BODY:
(the full post in Markdown, starting with the opening paragraph — no H1, the
site renders the title itself. Use ## for subheadings. End with the ## Sources
list if the paper had citations.)

NOTES:
(anything I should know before publishing: claims you could not verify, places
the paper contradicts itself, a tag you think is missing from the vocabulary,
or sections you cut and why. Write "None." if there are none.)
```
