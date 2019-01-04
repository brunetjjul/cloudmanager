const fs = require("fs");
const path = require('path');
const jquery = require('jquery');
const folderPath = 'G:\\data\\photos\\2016';

// fs.readdirSync(folderPath).forEach(element => {

// });
folder.onchange = function () {
    selectedFolder.value = this.value; 
    jQuery('#here_table').append(buildFolderContent(selectedFolder.value));
};
const openFolderExplorer = function () {
    folder.click();
};
const buildFolderContent = function () {
    const $ = require("jquery")(window);
    const table = jQuery('table').addClass('table');
 
    fs.readdir(selectedFolder.value, function (err, items) {
        console.log(items);

        for (var i = 0; i < items.length; i++) {
            console.log(items[i]);
            var row = jQuery('<tr>').addClass('bar').text(items[i]);
            table.append(row);
        }
    });
    return table;
};
