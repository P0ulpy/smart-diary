const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, "out/parsed.json");
const notesData = JSON.parse(fs.readFileSync(dataFilePath));

for(let i = notesData.length - 1; i >= 0; i--)
{
    if(notesData[i].title.includes("[Template]") || notesData[i].title.includes("Backlog"))
        continue;

    wakeUp(notesData[i]);
    break;
}

function exploreTree(lines, outString = "", recurseDepth = 0)
{
    let indent = "";
    for(let i = 0; i < recurseDepth; ++i) indent += '    ';

    for(const line of lines)
    {
        if(!line.checked)
        {
            outString += `${indent}- ${line?.line}\n`;
        }
        
        if(line.childs)
        {
            outString = exploreTree(line.childs, outString, recurseDepth + 1);
        }
    }

    return outString;
}

function wakeUp(note)
{
    let lastNoteTodos = "";

    for(const corpusItem of note.corpus)
    {
        if(corpusItem.type !== "today-todos")
            continue;

        lastNoteTodos = exploreTree(corpusItem.tree.childs);
    }

    const lastNote = 
`
Titre : ${note.title}
Sujet : ${note.topic}
Last Todos :
${lastNoteTodos}
`;
    console.log(lastNote);
}
