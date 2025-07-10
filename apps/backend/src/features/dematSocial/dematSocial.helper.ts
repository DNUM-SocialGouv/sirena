import fs from 'node:fs';

export type Variables = {
  variableName: string;
  updates: Partial<{
    id: string;
    label: string;
  }>;
};

export function updateObjectPropertyInFile(filePath: string, updates: Variables[]): void {
  let fileContent = fs.readFileSync(filePath, 'utf8');

  for (const { variableName, updates: props } of updates) {
    const objectRegex = new RegExp(`(const\\s+${variableName}\\s*=\\s*{)([\\s\\S]+?})(;?)`, 'gm');

    fileContent = fileContent.replace(objectRegex, (_match, start, body, end) => {
      let newBody = body;

      if (props.id !== undefined) {
        newBody = newBody.replace(/id:\s*['"`][^'"`]+['"`]/, `id: "${props.id}"`);
      }

      if (props.label !== undefined) {
        if (/label:\s*['"`][^'"`]+['"`]/.test(newBody)) {
          newBody = newBody.replace(/label:\s*['"`][^'"`]+['"`]/, `label: "${props.label}"`);
        } else {
          newBody = newBody.replace(/(type:\s*['"`][^'"`]+['"`],?)/, `$1\n  label: "${props.label}",`);
        }
      }

      return `${start}${newBody}}${end}`;
    });
  }

  fs.writeFileSync(filePath, fileContent, 'utf8');
}
