const fs = require("fs-extra");
const path = require('path');
const gui = require('nw.gui');


const visibility = {

    apply: function () {
        // Options and root older content visibility
        if (!!rootFolder.value) {
            divOptions.style.display = 'block';
            cardRootFolderContent.style.display = 'block';
        } else {
            divOptions.style.display = 'none';
            cardRootFolderContent.style.display = 'none';
        }

        // Process button visibility
        if (!!rootFolder.value &&
            fileProcessing.getProcessingOption() === "merge" &&
            !!mergeDestFolder.value) {
            buttonProcess.style.display = 'block';
        } else {
            buttonProcess.style.display = 'none';
        }

        // Merge target folder content visibility
        if (!!rootFolder.value &&
            fileProcessing.getProcessingOption() === "merge" &&
            !!mergeDestFolder.value) {
            cardMergeFolderContent.style.display = 'block';
        } else {
            cardMergeFolderContent.style.display = 'none';
        }

        // Merge file card visibility
        if (!!rootFolder.value && fileProcessing.getProcessingOption() === "merge") {
            divMergeFiles.style.display = 'block';
        } else {
            divMergeFiles.style.display = 'none';

        }
 
    }
}

const fileProcessing = {

    init: function () {
        visibility.apply();

        mergeDestFolderSelect.onclick = function () {
            this.selectDirectory(mergeDestFolder, function (oInput) {
                this.loadFolder(oInput.value, '#divMergeFolderContent')
            }.bind(this));
        }.bind(this);
        rootFolderSelect.onclick = function () {
            this.selectDirectory(rootFolder, function (oInput) {
                this.loadFolder(oInput.value, '#divRootFolderContent')
            }.bind(this));
        }.bind(this);
        buttonProcess.onclick = function () {
            this.process();
        }.bind(this);

        $(".radio").each((index, element) => {
            element.addEventListener('change', function () {
                visibility.apply();
            });
        });
    },
    process: function () {
        switch (this.getProcessingOption()) {
            case "merge":
                this.merge();
                break;

            default:
                break;
        }
    },
    merge: function () {

        const moveFiles = function (src, dest) {

            fs.readdirSync(src).forEach(item => {
                if (item === "Thumbs.db") {
                    return;
                }
                if (fs.lstatSync(src + '\\' + item).isDirectory()) {
                    moveFiles(src + '\\' + item, dest)
                } else {
                    fs.moveSync(src + '\\' + item, dest + '\\' + item);
                }
            });
        };
        moveFiles(rootFolder.value, mergeDestFolder.value);
        this.loadFolder(rootFolder.value, '#divRootFolderContent');
        this.loadFolder(mergeDestFolder.value, '#divMergeFolderContent');
        alert("Success !!!")

    },
    getProcessingOption: function () {
        return $("#divOptions input:checked").val();
    },
    folderChanged: function (oInput, sFolder) {
        oInput.value = path.resolve(sFolder);
        visibility.apply();
        return oInput.value;
    },
    loadFolder: function (sPath, sDivId) {

        const table = $('<table>').addClass('table');
        table.append(this.buildFolderItem(sPath, "..", sDivId));
        fs.readdirSync(sPath).forEach(item => {
            if (item === "Thumbs.db") {
                return;
            }
            table.append(this.buildFolderItem(sPath, item, sDivId));
        });

        $(sDivId).empty();
        $(sDivId).append(table);
    },
    getInputFromFolderDiv:function(sDivId){

        switch (sDivId) {
            case '#divRootFolderContent':
                return rootFolder;
                break;
            case '#divMergeFolderContent':
            return mergeDestFolder;
                break;

            default:
                break;
        }
    },
    navigateToFolder: function (sFolder, sDivId) {
        const oInput = this.getInputFromFolderDiv(sDivId);
        this.loadFolder(this.folderChanged(oInput, oInput.value + "\\" + sFolder), sDivId);
    },
    displayFile: function (sFile, sDivId) {
        const absFile = (this.getInputFromFolderDiv(sDivId ).value + "\\" + sFile).replace('\\', '/');
        gui.Window.open('file://' + absFile, {
            position: 'center',
            width: screen.width,
            height: screen.height
        });
    },
    buildFolderItem: function (sFolder, sItem, sDivId) {

        let icon, func;
        if (fs.lstatSync(sFolder.replace(/\\/g, "\\\\") + "\\\\" + sItem).isDirectory()) {
            icon = 'folder-open';

            func = function () { fileProcessing.navigateToFolder(sItem, sDivId); }
        } else {
            icon = 'file';
            func = function () { fileProcessing.displayFile(sItem, sDivId); }
        }
        const colIcon = $('<td>').append('<i class="fa fa-' + icon + '"></i>');
        const colName = $('<td>').text(sItem);

        const tr = $('<tr>');
        tr[0].onclick = func;
        return tr.append(colIcon).append(colName);
    },
    selectDirectory: function (oInput, fnCallback) {
        const dirSelector = $('<input id="directorySelector" type="file" style="display:none;" nwdirectory />');
        $('#dummy').append(dirSelector);
        directorySelector.onchange = function () {
            fileProcessing.folderChanged(oInput, this.value);
            if (fnCallback) {
                fnCallback.call(this, oInput);
            }
            this.remove();
        };
        directorySelector.oncancel = function () {
            this.remove();
        };
        directorySelector.click();
    }
}
fileProcessing.init(); 
