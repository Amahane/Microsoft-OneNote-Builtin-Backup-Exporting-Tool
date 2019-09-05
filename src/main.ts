import fs    from 'fs-extra';
import path  from 'path';
import chalk from 'chalk';

import * as console from './console';

const appInfo =
{
	title : "Microsoft OneNote Builtin Backup Exporting Tool"
};

const backupRoot = path.resolve(process.env.LOCALAPPDATA!, "./Microsoft/OneNote/16.0/备份/")

const chalks =
{
	path    : chalk.cyan,
	onenote : chalk.magentaBright,
}

async function scanNotebooks() : Promise<string[] | undefined>
{
	console.writeLine("正在检测可以导出的笔记本...");

	let notebooks : string[] | undefined;
	try
	{
		notebooks = await fs.readdir(backupRoot);
		if (notebooks.length === 0)
		{
			console.writeLine(console.tags.userError("当前 Microsoft OneNote 2016 备份文件中没有任何备份的笔记本 。"));
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
		"请选择需要导出的笔记本",
		chalks.onenote);
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

function scanBackups(sections : Section[]) : string[]
{
	let backups : string[] = [];
	sections.forEach(section =>
	{
		if (backups.find(backup => backup === section.backup) === undefined)
			backups.push(section.backup);
	})
	return backups;
}

async function questionBackup(notebook : string, backups : string[]) : Promise<string>
{
	return await console.writeAndQuestionChoice(
		`笔记本 ${ chalks.onenote(notebook) } 存在以下备份版本:`,
		backups,
		"请选择需要导出的备份",
		chalks.onenote);
}

function writeSections(sections : Section[]) : void
{
	console.writeLine("即将导出以下分区的备份:");
	console.writeList(sections.map<string>(section => chalks.onenote(section.fullName)));
}

async function questionDestinationRoot() : Promise<string | undefined>
{
	while (true)
	{
		const destinationRoot = await console.question("请输入导出目录，目录中不需包含笔记本名");
		if (! path.isAbsolute(destinationRoot))
		{
			console.writeLine(console.tags.userError("以上目录不是绝对路径。") + "需要绝对路径 ，请重试 >")
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
				`无法确认目录 ${ chalks.path(destinationRoot) } 是否存在，是否尝试创建此目录？输入y以继续 ，或输入n以退出`,
				input => input === "y" || input === "n");
			if (yesno === "n") return;

			try
			{
				await fs.mkdir(destinationRoot);
				return destinationRoot;
			}
			catch
			{
				console.writeLine(console.tags.systemError(`目录创建失败 ，${ chalks.path(destinationRoot) } 可能不是有效的目录。`));
				return;
			}
		}
	}
}

async function ready(
	notebook        : string,
	backup          : string,
	destinationRoot : string) : Promise<void>
{
	console.writeLine(
		`已经准备好将笔记本 ${ chalks.onenote(notebook) } ` +
		`的 ${ chalks.onenote(backup) } 备份` +
		`导出至目录 ${ chalks.path(destinationRoot) } ` +
		`下的 ${ chalks.path(notebook) } 文件夹中。`);
	await console.question(console.tags.notice(
		`按下 Enter 开始导出，` +
		`导出完成前强行终止程序可能导致不完整的导出 。`))
}

async function exportSections(
	sections : Section[],
	destinationRoot : string) : Promise<void[]>
{
	const context =
	{
		sectionCount    : sections.length,
		sectionExported : 0
	}
	return Promise.all(sections.map(async section =>
	{
		await section.export(destinationRoot);
		writeSectionSuccess (section, context)
	}));
};

function writeSectionSuccess(
	section : Section,
	context :
	{
		sectionCount    : number,
		sectionExported : number
	}) : void
{
	console.writeLine(console.tags.success(
		`[第${ ++ context.sectionExported }个` +
		`/共${ context.sectionCount }个] ` +
		`分区 ${ chalks.onenote(section.fullName) } 已经完成导出 ！`));
}

function writeFinish() : void
{
	console.writeLine(console.tags.success("所有分区已经完成导出。"));
}

(async () =>
{
	console.writeLine(appInfo.title);
	console.writeLine(console.separator);

	const notebooks : string[] | undefined = await scanNotebooks();
	if (! notebooks) return;
	const notebook = await questionNotebook(notebooks);

	const allSections = await scanSections(notebook);
	const backups     =       scanBackups(allSections);
	const backup      = await questionBackup(notebook, backups);
	const exportingSections = allSections.filter(section => section.backup === backup);
	console.writeLine(console.separator);

	writeSections(exportingSections)
	console.writeLine(console.separator);

	let   destinationRoot = await questionDestinationRoot();
	if (! destinationRoot) return;

	await ready(notebook, backup, destinationRoot);
	console.writeLine(console.separator);

	await exportSections(exportingSections, destinationRoot);
	console.writeLine(console.separator);

	writeFinish();
})()
