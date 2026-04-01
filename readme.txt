# Curriculum Data Bulk Import Guide

This document outlines the JSON structure and validation rules for importing curriculum data in the Training Management Tools.

---

## 1. Curriculum Editor JSON Structure

The Bulk Import system expects a precise JSON structure. The JSON file should ideally contain an array of **Unit** objects. Each unit contains an array of **Challenges**, and each challenge contains difficulty levels which hold the **Steps (Questions/Content)**.

### Basic JSON Schema Template

```json
[
  {
    "unitNumber": "1",
    "unitName": "Functions and Variables",
    "challenges": [
      {
        "challengeName": "Understanding Scope",
        "levels": {
          "easy": {
            "steps": 1,
            "stepDetails": [
              {
                "stepIndex": 0,
                "content": "<p>What is a global variable?</p>"
              }
            ]
          },
          "moderate": {
            "steps": 1,
            "stepDetails": [
              {
                "stepIndex": 0,
                "content": "<p>Write a function that modifies a local variable.</p>"
              }
            ]
          },
          "hard": {
            "steps": 0,
            "stepDetails": []
          }
        }
      }
    ]
  }
]
```

### Hierarchy Breakdown

- **Unit**:
  - `unitNumber`: (String or Number) Identifies the order/sequence of the unit.
  - `unitName`: (String) The title of the unit.
  - `challenges`: (Array) A list of challenge objects within this unit.

- **Challenge**:
  - `challengeName`: (String) The name of the specific coding or learning challenge.
  - `levels`: (Object) Must contain strictly three keys: `easy`, `moderate`, and `hard`.

- **Level (`easy` | `moderate` | `hard`)**:
  - `steps`: (Number) The total number of steps/questions in this specific difficulty level. 
  - `stepDetails`: (Array) A list of Step objects. **Note:** The array length must exactly match the `steps` number.

- **Step (The Question itself)**:
  - `stepIndex`: (Number) A zero-based index indicating the order of the step (0, 1, 2...).
  - `content`: (String) The HTML content or plain text representing the question, prompt, or instructions.

---

## 2. Validation Rules for the Questions (Steps)

When creating JSON data for import, please ensure your questions (`content` field) and step configuration adhere to the following validation rules:

1. **Exact Difficulty Key Names**
   The levels object must strictly use lowercase exact matches for: `"easy"`, `"moderate"`, `"hard"`.

2. **Accurate Step Counting**
   The value of `steps` (e.g., `2`) must exactly reflect the size of the `stepDetails` array for that particular difficulty level. If `steps` is 2, there must be exactly 2 items in the `stepDetails` list.

3. **Step Index Sequencing**
   The `stepIndex` inside each item of `stepDetails` must be sequentially ordered starting from **0** up to **steps - 1**. (E.g., for 3 steps, the indices must be 0, 1, and 2).

4. **Content Format**
   - The `content` field should be formatted as **HTML**. Standard tags like `<b>`, `<i>`, `<h2>`, `<p>` are supported.
   - For line breaks or paragraph separation, use `<p>` tags or `<br/>`. Plain text without tags will be rendered continuously.

5. **Image Handling**
   - Since images are embedded using custom insert functions, image paths inside the `content` must be **valid absolute URL paths** (e.g., `<img src="https://example.com/image.png" />`).
   - Please avoid relative file paths if your server does not host the images directly inside the step view.

6. **Safety**
   Never place executable JavaScript (`<script>` tags) inside the `content` fields. The platform parses the `content` securely, and injected scripts may cause unintended rendering issues in the React portal.

7. **Empty/Optional Fields**
   If a particular difficulty has no questions (e.g., no "hard" challenges), it must still be declared as an empty level state to avoid application crashes:
   `"hard": { "steps": 0, "stepDetails": [] }`
