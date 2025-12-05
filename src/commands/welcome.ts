import { printError, printInfo } from '../cli/console.js';

const DOG_ART_BASE_RAW = `
           ,////,
          /  ' ,)
         (ò____/
        /  ~ \\
       |  /   \`----.
       | |         |
      /   \\        |
     ~   / \\
    ~   |   \\
       /     \\
      '       '
`;

/**
 * Generates and returns an ASCII art string of a dog with a speech bubble.
 */
function generateDogArt(text: string): string {
	const textLength = text.length;
	const top = '   ' + '-'.repeat(textLength + 2) + '.';
	const middle = '  ( ' + text + ' )';
	const bottom = '   ' + '-'.repeat(textLength + 2) + "'";
	const tail1 = '      \\';
	const tail2 = '       \\';

	// Remove leading/trailing whitespace from dog art
	const cleanDogArt = DOG_ART_BASE_RAW.trim();
	const fullArt = `${top}\n${middle}\n${bottom}\n${tail1}\n${tail2}\n${cleanDogArt}`;

	return fullArt;
}

/**
 * Displays ASCII art of Azor the dog.
 */
export function printWelcome(): void {
	try {
		printInfo(generateDogArt('Woof Woof!'));
	} catch (error) {
		printError('Unknown Error.');
	}
}
