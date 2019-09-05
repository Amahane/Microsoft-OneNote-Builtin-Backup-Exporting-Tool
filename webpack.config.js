"use strict"

const path = require('path');

module.exports =
{
	mode    : "development",
	target  : "node",
	devtool : "inline-source-map",

	entry   : "./src/main.ts",
	resolve :
	{
		extensions : [ '.ts', '.js' ]
	},
	output  :
	{
		filename : 'main.js',
		path     :  path.resolve(__dirname, './build/')
	},

	module  :
	{
		rules:
		[
			{
				test    : /\.ts$/,
				use     : 'ts-loader',
				include :
				[
					path.resolve(__dirname, "./src/")
				]
			}
		]
	}
};
