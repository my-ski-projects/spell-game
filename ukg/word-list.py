#!/usr/bin/env python3

def categorize_words_by_alphabet(input_filepath="all-words.txt"):
    """
    Reads words from a file and creates separate files for words
    starting with each letter of the alphabet.

    Args:
        input_filepath (str): The path to the input file containing words.
    """
    try:
        with open(input_filepath, 'r') as infile:
            word_files = {}
            for line in infile:
                word = line.strip().upper()  # Remove whitespace and convert to uppercase for consistent categorization
                if word:  # Ensure the line is not empty
                    first_letter = word[0]
                    if 'A' <= first_letter <= 'Z':  # Process only alphabetic first letters
                        if first_letter not in word_files:
                            word_files[first_letter] = open(f"{first_letter}.txt", 'w')
                        word_files[first_letter].write(line) # Write the original line, including its case

        print("Files created successfully:")
        for letter in sorted(word_files.keys()):
            print(f"- {letter}.txt")

    except FileNotFoundError:
        print(f"Error: The file '{input_filepath}' was not found.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        # Close all opened files
        for f in word_files.values():
            f.close()

# Example usage:
if __name__ == "__main__":
    categorize_words_by_alphabet()