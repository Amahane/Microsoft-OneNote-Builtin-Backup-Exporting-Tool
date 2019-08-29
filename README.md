# Microsoft OneNote Builtin Backup Exporting Tool

还在因为 Microsoft OneNote for Windows 10 强制使用云端笔记本而困扰 ？使用这个简单的命令行工具 ，借助 Microsoft OneNote 2016 内建的备份机制 ，将笔记本从云端导出到本地 。

## 教程 ：如何使用 Microsoft OneNote 2016 与 Microsoft OneNote Builtin Backup Exporting Tool 将笔记从云端导出到本地

1. 获取 Microsoft OneNote 2016（ [x86](https://go.microsoft.com/fwlink/?linkid=2024197) / [x64](https://go.microsoft.com/fwlink/?linkid=2024446) ）；
2. 使用 Microsoft OneNote 2016 登录你的 Microsoft 账户 ，打开需要导出至本地的笔记本 ，等待 Microsoft OneNote 2016 将这些笔记本缓存至本地 ；
3. 选择 `文件` > `选项` > `保存和备份` > `立即备份所有笔记本` ，等待 Microsoft OneNote 2016 将这些笔记本导出至 Microsoft OneNote 2016 备份文件夹 ；
4. 获取 Microsoft OneNote Builtin Backup Migration Tool 源文件 ；
5. 打开终端 ，导航至 Microsoft OneNote Builtin Backup Migration Tool 源文件目录 ，运行 `npm start` 命令 ，稍候片刻 Microsoft OneNote Builtin Backup Exporting Tool 就会启动 ；
6. 根据提示选择需要导出的笔记本 ，选择需要导出的备份 ，指定导出目录 ，稍候片刻 Microsoft OneNote Builtin Backup Exporting Tool 就会导出选定的笔记本的所有分区文件（ `.one`文件 ）至指定的目录 ；
7. 所有分区导出完成后 ，回到 Microsoft OneNote 2016 ，选择 `文件` > `打开` > `浏览` ，导航至导出的笔记本目录 ，选择 `打开` ；
8. Microsoft OneNote 2016 提示 “ 此位置找不到笔记本 ，是否要打开 ... 作为笔记本 ？” ，选择 `是` ，Microsoft OneNote 2016 会重新建立笔记本索引文件（ `.onetoc2` 文件 ）；

## 备注

+ Microsoft OneNote Builtin Backup Exporting Tool 目前仅能识别中文（ 中国 ）语言的 Microsoft OneNote 2016 备份文件 ；
