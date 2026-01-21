
# Script to fix words.ejs by removing duplicate lines 16-363
file_path = r'c:\Users\VICTUS\Desktop\BEST\specialist-portal\views\specialist\words.ejs'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # We want to delete lines 16 to 363 (1-based).
    # In 0-based index: delete indices 15 to 362.
    # So we keep [:15] and [363:]
    
    # Verify line 16 (index 15) is the start of duplicate block
    # Verify line 364 (index 363) is the start of the 'else' block
    
    print(f"Total lines: {len(lines)}")
    if len(lines) > 370:
        print(f"Line 16 content: {lines[15]}")
        print(f"Line 364 content: {lines[363]}")
        
        new_content = lines[:15] + lines[363:]
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(new_content)
        print("Successfully removed lines 16-363.")
    else:
        print("File is too short, possibly already modified.")

except Exception as e:
    print(f"Error: {e}")
