import fs       from 'fs-extra';
import path     from 'path';
import assert   from 'assert';
import chalk    from 'chalk'
import readline from 'readline';

function range(begin : number, end : number) : number[]
{
	return [...(function *() : IterableIterator<number>
	{
		for (let i = begin; i < end; ++ i) yield i;
	})()];
}

const console =
{
	write(s : string) : void
	{
		process.stdout.write(s);
	},

	writeLine(s : string) : void
	{
		process.stdout.write(`${ s }\n`);
	},

	writeError(s : string) : void
	{
		process.stdout.write(chalk.red(`[错误] ${ s }\n`));
	},

	async question(query : string) : Promise<string>
	{
		const i = readline.createInterface(
		{
			input    : process.stdin,
			output   : process.stdout,
			terminal : true
		});

		const s = await new Promise<string>(
			resolve => i.question(query, answer => resolve(answer)))

		i.close();

		return s;
	},

	writeChoices(choices : string[]) : void
	{
		choices.forEach((value, index) => value && this.writeLine(`[${ index + 1 }] ${ value }`));
	},

	async questionChoice(choices : string[], query : string, queryRetry : string) : Promise<string>
	{
		let retry = false;
		while (true)
		{
			const choice = await this.question(retry ? queryRetry : query);
			if (choices.find(value => value === choice)) return choice;
			retry = true;
		}
	}
};

(async () =>
{
	console.writeLine("Microsoft OneNote Builtin Backup Exporting Tool");
	console.writeLine('-'.repeat(60));

	console.write("正在检测可以导出的笔记本 ...");

	const backupRoot = path.resolve(process.env.LOCALAPPDATA!, "./Microsoft/OneNote/16.0/备份/")
	let notebooks : string[] = [];
	try
	{
		notebooks = await fs.readdir(backupRoot);
	}
	catch
	{
		console.writeError("无法定位 Microsoft OneNote 2016 备份文件 。");
		process.exit();
	}

	if (notebooks.length === 0)
	{
		console.writeLine(chalk.yellow("[信息] 当前 Microsoft OneNote 2016 备份文件中没有任何备份的笔记本 。 "));
		return;
	}

	console.writeLine("发现以下备份的笔记本可以导出 ：");
	console.writeChoices(notebooks);
	const notebook = notebooks[Number(await console.questionChoice(
		range(1, notebooks.length + 1).map(i => i.toString()),
		"请选择需要导出的笔记本（ 输入编号 ）> ",
		`${ chalk.red("无效选项。") }请重新选择需要导出的笔记本（ 输入编号 ）> `)) - 1];

	interface Section
	{
		notebook : string;
		hierarchy : string[];
		name : string;
		backup : string;
	}

	function getSectionPath(section : Section) : string
	{
		return path.resolve(
			backupRoot, section.notebook, ...section.hierarchy,
			`${ section.name }.one (于 ${ section.backup }).one`);
	}

	function getSectionFullName(section : Section) : string
	{
		return `${ section.hierarchy.join(' / ') } / ${ section.name }`;
	}

	async function searchSections(hierarchy : string[]) : Promise<Section[]>
	{
		let sections : Section[] = [];
		for (const fileOrSubdir of await fs.readdir(path.resolve(backupRoot, notebook, ... hierarchy)))
		{
			if ((await fs.stat(path.resolve(backupRoot, notebook, ... hierarchy, fileOrSubdir))).isDirectory())
			{
				sections = [ ... sections, ... await searchSections([... hierarchy, fileOrSubdir])];
			}
			else
			{
				if (fileOrSubdir.endsWith(".one"))
				{
					const [ name, backupAndSuffix ] = fileOrSubdir.split(".one (于 ");
					const [ backup ] = backupAndSuffix.split(").one");
					sections.push(
					{
						notebook : notebook,
						hierarchy : hierarchy,
						name : name,
						backup : backup
					})
				}
			}
		}
		return sections;
	}

	const scannedSections = await searchSections([]);
	const backups  = (() : string[] =>
	{
		let backups : string[] = [];
		scannedSections.forEach(section =>
		{
			if (backups.find(backup => backup === section.backup) === undefined)
				backups.push(section.backup);
		})
		return backups;
	})();
	console.writeLine(`准备导出笔记本 \"${ notebook }\"。这个笔记本存在以下备份版本 ：`);
	console.writeChoices(backups);
	const backup = backups[Number(await console.questionChoice(
		range(1, backups.length + 1).map(i => i.toString()),
		"请选择需要导出的备份（ 输入编号 ）> ",
		`${ chalk.red("无效选项。") }请重新选择需要导出的备份（ 输入编号 ）> `)) - 1];

	const filteredSections = scannedSections.filter(section => section.backup === backup);
	console.writeLine("即将导出以下分区的备份 ：");
	console.writeLine(filteredSections.map<string>(section => `\t${ getSectionFullName(section) }`).join('\n'));


	let destination = await (async () : Promise<string | undefined> =>
	{
		while (true)
		{
			const destination = await console.question("请输入导出目录，目录中不需包含笔记本名 > ");
			if (! path.isAbsolute(destination))
			{
				console.writeLine(chalk.red("以上目录不是绝对路径。") + "需要绝对路径 ，请重试 >")
				continue;
			}
			try
			{
				await fs.access(destination);
				return destination;
			}
			catch
			{
				const yesno = await console.questionChoice(
					['y', 'n'],
					`无法确认目录 \"${ destination }\"是否存在，是否尝试创建此目录？输入 y 以继续 ，或输入 n 以退出 > `,
					`${ chalk.red("不是有效的输入。") } 输入 y 以继续 ，或输入 n 以退出 >`);
				if (yesno === "n") return;

				try
				{
					await fs.mkdir(destination);
					return destination;
				}
				catch
				{
					console.writeError(`目录创建失败 ，\"${ destination }\" 可能不是有效的目录。`);
					return;
				}
			}
		}
	})();
	if (! destination) return;

	console.writeLine(`已经准备好将笔记本 ${ notebook } 的 ${ backup } 备份导出至目录 \"${ destination }\" 下的 ${ notebook } 文件夹中。`)
	await console.question(chalk.yellow(`按下 Enter 开始导出 ，注意导出完成前强行终止程序可能导致不完整的导出 。`))

	function getSectionDestinationPath(section : Section) : string
	{
		return path.resolve(
			destination!, section.notebook, ...section.hierarchy,
			`${ section.name }.one`);
	}

	let sectionCopied = 0;
	const actions : Promise<void>[] = filteredSections.map(async section =>
	{
		await fs.copy(getSectionPath(section), getSectionDestinationPath(section));
		console.writeLine(chalk.green(
			`[成功] [第 ${ ++ sectionCopied } 个 / 共 ${ filteredSections.length } 个] 分区 ${ getSectionFullName(section) } 已经完成导出 ！`));
	});
	await Promise.all(actions);

	console.writeLine(chalk.green("[成功] 所有分区已经完成导出。"));
})()
