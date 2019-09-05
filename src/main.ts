import fs      from 'fs-extra';
import path    from 'path';
import chalk from 'chalk';

import * as console from './console';

const appInfo =
{
	title : "Microsoft OneNote Builtin Backup Exporting Tool"
};

const backupRoot = path.resolve(process.env.LOCALAPPDATA!, "./Microsoft/OneNote/16.0/备份/")

async function scanNotebooks() : Promise<string[] | undefined>
{
	console.writeLine("正在检测可以导出的笔记本...");

	let notebooks : string[] | undefined;
	try
	{
		notebooks = await fs.readdir(backupRoot);
		if (notebooks.length === 0)
		{
			console.writeLine(console.tags.userError("[提示] 当前 Microsoft OneNote 2016 备份文件中没有任何备份的笔记本 。"));
			return;
		}
		else return notebooks;
	}
	catch
	{
		console.writeLine(console.tags.systemError("无法定位 Microsoft OneNote 2016 备份文件 。"));
		return;
	}
};

async function questionNotebook(notebooks : string[]) : Promise<string>
{
	return await console.writeAndQuestionChoice(
		"发现以下备份的笔记本可以导出:",
		notebooks,
		"请选择需要导出的笔记本");
}

class Section
{
	constructor(
		public notebook  : string,
		public hierarchy : string[],
		public name      : string,
		public backup    : string) { }

	public get fullName () : string
	{
		return this.hierarchy.concat([ this.name ]).join('/');
	}

	public async export (destinationRoot : string) : Promise<void>
	{
		await fs.copy(this.getSourcePath(), this.getDestinationPath(destinationRoot));
	}

	public getSourcePath() : string
	{
		return path.resolve(
			backupRoot,
			this.notebook,
			... this.hierarchy,
			`${ this.name }.one (于 ${ this.backup }).one`);
	}

	public getDestinationPath(destinationRoot : string) : string
	{
		return path.resolve(
			destinationRoot,
			this.notebook,
			... this.hierarchy,
			`${ this.name }.one`);
	}
}

async function scanSections(
	notebook  : string,
	hierarchy : string[] = []) : Promise<Section[]>
{
	let sections : Section[] = [];
	for (const fileOrSubdir of await fs.readdir(path.resolve(backupRoot, notebook, ... hierarchy)))
	{
		if ((await fs.stat(path.resolve(backupRoot, notebook, ... hierarchy, fileOrSubdir))).isDirectory())
		{
			sections = [ ... sections, ... await scanSections(notebook, [... hierarchy, fileOrSubdir])];
		}
		else
		{
			if (fileOrSubdir.endsWith(".one"))
			{
				const [ name, backupAndSuffix ] = fileOrSubdir.split(".one (于 ");
				const [ backup ] = backupAndSuffix.split(").one");
				sections.push(
				new Section(notebook, hierarchy, name, backup))
			}
		}
	}
	return sections;
}

async function questionDestinationRoot() : Promise<string | undefined>
{
	while (true)
	{
		const destinationRoot = await console.question("请输入导出目录，目录中不需包含笔记本名");
		if (! path.isAbsolute(destinationRoot))
		{
			console.writeLine(chalk.red("以上目录不是绝对路径。") + "需要绝对路径 ，请重试 >")
			continue;
		}
		try
		{
			await fs.access(destinationRoot);
			return destinationRoot;
		}
		catch
		{
			const yesno = await console.questionTillValid(
				`无法确认目录 \"${ destinationRoot }\"是否存在，是否尝试创建此目录？输入y以继续 ，或输入n以退出`,
				input => input === "y" || input === "n");
			if (yesno === "n") return;

			try
			{
				await fs.mkdir(destinationRoot);
				return destinationRoot;
			}
			catch
			{
				console.writeLine(console.tags.systemError(`目录创建失败 ，\"${ destinationRoot }\" 可能不是有效的目录。`));
				return;
			}
		}
	}
}

(async () =>
{
	console.writeLine(appInfo.title);
	console.writeLine(console.separator);

	const notebooks : string[] | undefined = await scanNotebooks();
	if (! notebooks) return;
	const notebook = await questionNotebook(notebooks);

	const sectionsOfAllNotebook = await scanSections(notebook);
	const backups  = (() : string[] =>
	{
		let backups : string[] = [];
		sectionsOfAllNotebook.forEach(section =>
		{
			if (backups.find(backup => backup === section.backup) === undefined)
				backups.push(section.backup);
		})
		return backups;
	})();
	const backup = await console.writeAndQuestionChoice(
		`准备导出笔记本 \"${ notebook }\"。这个笔记本存在以下备份版本:`,
		backups,
		"请选择需要导出的备份"
	);

	const filteredSections = sectionsOfAllNotebook.filter(section => section.backup === backup);
	console.writeLine("即将导出以下分区的备份:");
	console.writeList(filteredSections.map<string>(section => section.fullName));

	let destinationRoot = await questionDestinationRoot();
	if (! destinationRoot) return;

	console.writeLine(`已经准备好将笔记本 ${ notebook } 的 ${ backup } 备份导出至目录 \"${ destinationRoot }\" 下的 ${ notebook } 文件夹中。`)
	await console.question(chalk.yellow(`按下 Enter 开始导出 ，注意导出完成前强行终止程序可能导致不完整的导出 。`))

	let sectionCopied = 0;
	const actions : Promise<void>[] = filteredSections.map(async section =>
	{
		await section.export(destinationRoot !);
		console.writeLine(console.tags.success(`[第${ ++ sectionCopied }个/共${ filteredSections.length }个] 分区 \"${ section.fullName }\" 已经完成导出 ！`));
	});
	await Promise.all(actions);

	console.writeLine(console.tags.success("所有分区已经完成导出。"));
})()
