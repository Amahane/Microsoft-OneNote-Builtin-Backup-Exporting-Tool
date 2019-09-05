import chalk, { Chalk } from 'chalk';
import readline         from 'readline';

export interface Tag
{
	(message : string) : string;
}

export interface Bullet
{
	render(item : string, index : number) : string;
}

export function createTag(text : string, style : Chalk) : Tag
{
	return message => style(`[${ text }] ${ message }`);
}

export function createBullet(
	render : (item : string, index : number) => string) : Bullet
{
	return { render };
}

export const prompt    = '> ';
export const separator = '—'.repeat(60);

export const tags =
{
	notice      : createTag("注意", chalk.yellowBright),
	success     : createTag("成功", chalk.greenBright ),
	userError   : createTag("错误", chalk.yellowBright),
	systemError : createTag("错误", chalk.redBright   ),
}

export const bullets =
{
	unordered :
	{
		default : createBullet((item, index) => '\u2022')
	},
	ordered:
	{
		default : createBullet((item, index) => `[${ index }]`)
	}
};

export function write(message : string) : void
{
	process.stdout.write(message);
}

export function writeLine(message : string) : void
{
	process.stdout.write(`${ message }\n`);
}

export async function question(
	query     : string  = '',
	usePrompt : boolean = true) : Promise<string>
{
	const i = readline.createInterface(
	{
		input    : process.stdin,
		output   : process.stdout,
		terminal : true
	});

	const q = query
		? usePrompt ? `${ query } ${ prompt }` : query
		: usePrompt ?                prompt    : '';
	const s = await new Promise<string>(resolve => i.question(q, answer => resolve(answer)))

	i.close(); return s;
}

export function writeList(
	items     : string[],
	bullet    : Bullet = bullets.unordered.default,
	itemStyle : Chalk  = chalk) : void
{
	items.forEach((value, index) => writeLine(`${ bullet.render(value, index + 1) } ${ value }`));
}

export async function questionTillValid(
	query : string,
	validateCallback : (input : string) => boolean,
	errorCalllback   : (input : string) => void =
		(input) => writeLine(tags.userError(`${ input } 不是有效的输入。`)),
	usePrompt : boolean = true) : Promise<string>
{
	while (true)
	{
		const input = await question(query, usePrompt);
		if (validateCallback(input)) return input;
		errorCalllback(input);
	}
}

export async function writeAndQuestionChoice(
	intro     : string  ,
	items     : string[],
	query     : string  ,
	itemStyle : Chalk   = chalk,
	usePrompt : boolean = true) : Promise<string>
{
	writeLine(intro);
	writeList(items, bullets.ordered.default, itemStyle);

	const input = await questionTillValid(
		usePrompt ? `${ query }(输入序号) ${ prompt }` : query,
		input =>
		{
			if (! input) return false;
			const index = Number(input);
			if (! Number.isInteger(index)) return false;
			return index >= 1 && index <= items.length;
		},
		input => writeLine(tags.userError(`\"${ input }\" 不是有效的序号。`)),
		false);

	return items[Number(input) - 1];
}