import os

exclude_dirs = {'.github', 'node_modules', 'node_modulesx', 'out', '.git', '.next', 'temp', 'sync'}
exclude_patterns = {'tree.py', 'tree.ps1', 'tree2.ps1','tree3.ps1','.txt'}
path = "."

def build_tree(root, exclude, patterns):
    tree = {}
    for dirpath, dirnames, filenames in os.walk(root):
        # Filter out excluded directories
        dirnames[:] = [d for d in dirnames if d not in exclude]
        
        # Get relative path and parts
        rel_path = os.path.relpath(dirpath, root)
        parts = rel_path.split(os.sep) if rel_path != '.' else []

        # Traverse the tree structure and insert directories
        current = tree
        for part in parts:
            if part not in current:
                current[part] = {}
            current = current[part]
        
        # Insert directories into the tree structure first
        for dirname in sorted(dirnames):
            if dirname not in current:
                current[dirname] = {}

        # Insert files into the tree structure, excluding those with specified patterns
        for filename in sorted(filenames):
            name, ext = os.path.splitext(filename)
            if not any(pattern in filename for pattern in patterns) and not ('-' in ext or '_' in ext):
                current[filename] = None
    return tree

def print_tree(node, indent="", line_number=[0], output=[]):
    # Separate directories and files
    dirs = [key for key in node.keys() if isinstance(node[key], dict)]
    files = [key for key in node.keys() if node[key] is None]

    # Print directories first
    for key in sorted(dirs):
        line_number[0] += 1
        output.append(f"{indent}+---{key}")
        print_tree(node[key], indent + "|   ", line_number, output)

    # Print files next
    for key in sorted(files):
        line_number[0] += 1
        output.append(f"{indent}{key}")

    return output

if __name__ == "__main__":
    tree = build_tree(path, exclude_dirs, exclude_patterns)
    output = print_tree(tree)

    # Write output to file
    with open("tree4.txt", "w") as f:
        f.write("\n".join(output))
    
    # Print summary to console
    print(f"Total items after filtering: {len(output)}")
    print("Done")
