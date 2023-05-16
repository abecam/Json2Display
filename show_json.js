// From https://stackoverflow.com/questions/4810841/pretty-print-json-using-javascript

function syntaxHighlight(jsonToShow) {
    jsonToShow = JSON.stringify(jsonToShow, undefined, 4);
    jsonToShow = jsonToShow.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    coloredJson =  jsonToShow.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
    document.getElementById("json_content").appendChild(document.createElement('pre')).innerHTML = coloredJson;
}