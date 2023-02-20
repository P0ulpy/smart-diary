/**
 * https://github.com/jozdk/simple-markdown-parser/blob/main/main.js
 * https://enqueuezero.com/markdown-parser.html
 * https://yiou.me/blog/posts/how-does-markdown-parser-work
 * https://sarvasvkulpati.com/blog/markdown-parser
 * https://www.codexpedia.com/regex/regex-symbol-list-and-regex-examples/
 * Unordered list raw = https://regex101.com/r/9bQWMj/1
 */

// For windows 11 x64
const Color = {
    reset: '\x1b[0m',

    bold: '\x1b[1m',
    fade: '\x1b[2m',
    italic: '\x1b[3m',
    underlined: '\x1b[4m',
    highlight: '\x1b[7m',
    nosure_invisible: '\x1b[8m',
    barred: '\x1b[9m',

    fgSoftGrey: '\x1b[30m',
    fgSoftRed: '\x1b[31m',
    fgSoftGreen: '\x1b[32m',
    fgSoftWellow: '\x1b[33m',
    fgSoftBlue: '\x1b[34m',
    fgSoftPurple: '\x1b[35m',
    fgSoftCyan: '\x1b[36m',
    fgSoftWhite: '\x1b[37m',

    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgWellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgPurple: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',

    fgGrey: '\x1b[90m',
    fgRed: '\x1b[91m',
    fgGreen: '\x1b[92m',
    fgWellow: '\x1b[93m',
    fgBlue: '\x1b[94m',
    fgPurple: '\x1b[95m',
    fgCyan: '\x1b[96m',
    fgWhite: '\x1b[97m',

    bgGrey: '\x1b[100m',
    bgSoftRed: '\x1b[41m',
    bgSoftGreen: '\x1b[42m',
    bgSoftWellow: '\x1b[43m',
    bgSoftBlue: '\x1b[44m',
    bgSoftPurple: '\x1b[45m',
    bgSoftCyan: '\x1b[46m',
    bgSoftWhite: '\x1b[47m',
};

// TODO :
// - Put in a module
// - Fix Error Color (maybe use directly stderr)
console.note = (...args) => console.log(Color.bold + Color.fgBlue, ...args, Color.reset);
console.warning = (...args) => console.log(Color.bold + Color.fgWellow, ...args, Color.reset);
const consoleError = console.error;
console.error = (...args) => consoleError(Color.bold + Color.fgRed, ...args, Color.reset);

/// ---------------- [ CODE ] ------------------ 

const fs = require('fs');
const path = require('path');

const sourceFilePath = path.join(__dirname, "source/source.md");
const notes = fs.readFileSync(sourceFilePath);

let parsedNotes = [];

for (const note of notes.toString().split(/-{3}[\r|\n]/)) {
    parsedNotes.push(processNote(note));
}

fs.writeFileSync(path.join(__dirname, "out/parsed.json"), JSON.stringify(parsedNotes, null, '\t'));

function processNote(note = "") {
    const parsedNote = {
        source: note.toString(),
        title: "",
        topic: "",
        corpus: []
    };

    const titleResult = extractTitle(note);
    parsedNote.title = titleResult.data;
    note = applyOffset(note, titleResult.endAt);

    const topicResult = extractTopic(note);
    parsedNote.topic = topicResult.data;

    console.log(`------------------- [ Note : ${parsedNote.title} ] --------------------`);

    parsedNote.corpus = processNoteCorpus(applyOffset(note, topicResult.endAt))

    return parsedNote;
}

function applyOffset(note, offset) { return note.substring(offset + 1, note.length - 1); }

function extractTitle(note = "") 
{
    const titleMatch = note.matchAll(/(#{2}\s)(.*)/g).next().value;

    if(!titleMatch)
        throw new Error("not title founded : this note is invalid (problem with `---` separator ?)");

    return {
        data: titleMatch[2]?.trim() || "",
        endAt: ((titleMatch?.index - 1) + (titleMatch[0]?.length - 1)) || 0,
    };
}

function extractTopic(note = "") 
{
    let topic = "";
    let lastMatch = [];

    for (const match of note.matchAll(/(^(\>{1})(\s)(.*)(?:$)?)+/gm)) {
        topic += `${match[4]}\n`;
        lastMatch = match;
    }

    return {
        data: topic.trim(),
        endAt: ((lastMatch?.index - 1) + (lastMatch[0]?.length - 1)) || 0,
    };
}

function processNoteCorpus(corpus = "", depth = 3) 
{
    //Titles
    let matches = [...corpus.matchAll(/#{3}\s(.*?)[\r|\n]/g)];
    
    const corpusTockens = [];

    for (let i = 0; i < matches.length; ++i) 
    {
        const corpusTocken = {};

        if(i + 1 < matches.length)
        {
            corpusTocken.title = matches[i][1];
            corpusTocken.content = corpus.slice(matches[i].index, matches[i + 1].index); 
        }
        else
        {
            corpusTocken.title = matches[i][1];
            corpusTocken.content = corpus.slice(matches[i].index); 
        }

        setCorpusTockenType(corpusTocken);
        processCorpusTocken(corpusTocken);

        corpusTockens.push(corpusTocken);
    }

    return corpusTockens;
}

function setCorpusTockenType(corpusTocken = {})
{
    const title = corpusTocken.title.toLocaleLowerCase().trim();

    if(title.includes('today todos'))
        corpusTocken.type = 'today-todos';
    else if(title.includes('timey wimey stuffs') || title.includes('Timey wimey stuffs') || title.includes('demain') || title.includes('next time'))
        corpusTocken.type = 'next-time';
    else
        corpusTocken.type = 'plain-text';
} 

/// ------------------ [ CurpusParsing ] ---------------------

function processCorpusTocken(corpusTocken = {})
{
    console.log(Color.fgCyan, `----------- [ CorpusTocken : ${corpusTocken.type} ] -----------`, Color.reset);

    switch(corpusTocken.type)
    {
        case 'today-todos': processListTree(corpusTocken); break;
    }
}

function processListTree(corpusTocken = { content: "" })
{
    const findTreeExpr = /^-\s[\S\s]*?(?=^\s*\n^(?!(\s*-\s|\s*\n))|^\d\.\s)|^-\s[\S\s]*/gm;
    const treeRaw = [...corpusTocken.content.matchAll(findTreeExpr)][0][0];

    const tree = {
        line: 'root',
        childs: []
    };

    treeRecursiveExploration(tree, treeRaw);

    corpusTocken.tree = tree;
}

function treeRecursiveExploration(parentTreeNode = { line: "", childs: [] }, content = "")
{
    const splitTreeExpr = /(?:^ {0,1}- +)[\s\S]*?(?=\n(?=^ {0,1}- +))|(?:^ {0,1}- +)[\s\S]*/gm;
    const splitedTree = content.matchAll(splitTreeExpr);

    for(const treeNode of splitedTree)
    {
        const nodeContent = treeNode[0];

        let newNode = {
            line: ""
        }

        const getInnerNodeExpr = /(?:^ {2,}|\t)- +[\s\S]+?(?=\n(?=- )|<\/li>)|(?:^ {2,}|\t)- +[\s\S]+/m;

        newNode.line = nodeContent.replace(getInnerNodeExpr, "");
        
        if(getInnerNodeExpr.test(nodeContent))
        {
            newNode.childs = [];
            const indentLength = newNode.line.match(/^[ |\t]{0,}/gm).length + 1 || 0;
            
            let newNodeContent = nodeContent.match(getInnerNodeExpr)[0];
            newNodeContent = newNodeContent.replace(new RegExp(`^ {${indentLength}}`, 'gm'), "");

            treeRecursiveExploration(newNode, newNodeContent);
        }

        newNode.line = newNode.line.trim();
        newNode = treeElementParse(newNode);
        
        parentTreeNode.childs.push(newNode);
    }
}

function treeElementParse(treeNode = { line: "", childs: undefined, checked: undefined })
{
    const preLineCleanExpr = /^\s*-\s+/g;
    treeNode.line = treeNode.line.replace(preLineCleanExpr, '');

    const boolStateExpr = /\[(\s|x|X)\]/g;
    const checkMatch = [...treeNode.line.matchAll(boolStateExpr)][0];

    if(checkMatch.length >= 1)
    {
        treeNode.checked = /x|X/.test(checkMatch[1]);
    }

    treeNode.line = treeNode.line.replace(boolStateExpr, '').trim();

    return treeNode;
}


function processParagraphsSplit()
{
    const splitParagraphsExpr = /(^(?!<h(?:1|2|3|4|6|r)>|<blockquote>|<\/blockquote>|<p>|<ol>|<ul>|( {4,}|\t)| *\n)[\S\s]+?(?=<h(?:1|2|3|4|6|r)>|<blockquote>|<\/blockquote>|<p>|<ol>|<ul>|^ *\n)|^(?!<h(?:1|2|3|4|6|r)>|<blockquote>|<\/blockquote>|<p>|<ol>|<ul>|( {4,}|\t)| *\n)[\S\s]+)/gm;    
}

function processCodeBlock() 
{
    const findCodeBlockExpr = /(^(?:( {4,}|\t))[^\s]+[\S\s]+?(?=\n<p>|<h(?:1|2|3|4|5|6|r)>|<blockquote>|<\/blockquote>|<ol>|<ul>|^ *\n(?! {4,}|\t))|^(?:( {4,}|\t))[^\s]+[\S\s]+)/gm;;
}