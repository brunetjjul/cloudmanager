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
        // Video Compress card visibility
        if (!!rootFolder.value && fileProcessing.getProcessingOption() === "videoCompress") {
            divVideoCompress.style.display = 'block';
        } else {
            divVideoCompress.style.display = 'none';

        }

        // if Video Compress option choosen, only display video files

        if (fileProcessing.getProcessingOption() === "videoCompress") {

            divVideoCompress.style.display = 'block';
        } else {
            divVideoCompress.style.display = 'none';

        }

    }
}

const utils = {
    displayFile: function (sFile) {
        gui.Window.open('file://' + sFile, {
            position: 'center',
            width: screen.width,
            height: screen.height
        });
    },

    manageSingleDoubleClick: function (element, funcClick, funcDblClick) {
        var DELAY = 300, clicks = 0, timer = null;
        element.onclick = function (e) {
            clicks++;  //count clicks

            if (clicks === 1) {

                timer = setTimeout(function () {
                    funcClick.call();
                    clicks = 0;             //after action performed, reset counter
                }, DELAY);
            } else {
                clearTimeout(timer);    //prevent single-click action 
                funcDblClick.call();
                clicks = 0;             //after action performed, reset counter
            };
        }
        element.ondblclick = function (e) { e.preventDefault() };
    }
}
function FSItems(oParams) {

    this.setDiv = function (sDiv) {
        this.sDiv = sDiv;
    }
    this.setItemClicked = function (fnItemClicked) {
        this.fnItemClicked = fnItemClicked;
    }
    this.setItemDblClicked = function (fnItemDblClicked) {
        this.fnItemDblClicked = fnItemDblClicked;
    }
    this.addItem = function (sPath, bRemovable, bDisplayOnlyBasename) {
        const oItem = {};
        oItem.sPath = sPath;
        if (fs.lstatSync(oItem.sPath.replace(/\\/g, "\\\\") + "\\\\").isDirectory()) {
            oItem.bFolder = true;
        }
        oItem.bRemovable = bRemovable;
        oItem.bDisplayOnlyBasename = bDisplayOnlyBasename;
        oItem.sDirName = path.dirname(oItem.sPath);
        oItem.sBaseName = path.basename(oItem.sPath);
        switch (path.extname(oItem.sPath)) {
            case '.mp4' || '.avi':
                oItem.bVideo = true;
                break;
            case '.jpg' || '.jpeg':
                oItem.bImage = true;
                break;

            default: break;
        }

        this.aFileList.push(oItem);

        this.render();
    }
    this.removeItem = function (sPath) {
        this.aFileList = this.aFileList.filter(function (oElement) {
            return (oElement.sPath !== sPath)
        })
        this.render();
    }
    this.load = function () {
        this.aFileList = [];
        this.render();
    }
    FSItems.prototype.render = function () {

        const table = $('<table>').addClass('table');

        this.aFileList.forEach(element => {
            table.append(this.renderItem(element));
        });
        $(this.sDiv).empty();
        $(this.sDiv).append(table);
    }
    FSItems.prototype.renderItem = function (oItem) {


        let icon, funcClick, funcDblClick, colRemove;
        if (oItem.bFolder) {
            icon = 'folder';
            funcClick = function () {
                // this.navigateToFolder(oItem.sName);
            }.bind(this)
        } else {
            icon = 'file';
            funcClick = function () {
                if (this.fnItemClicked) {
                    this.fnItemClicked((this.sPath + "\\" + oItem.sName).replace('\\', '/'));
                }
            }.bind(this);
            funcDblClick = function () {
                this.fnItemDblClicked((this.sPath + "\\" + oItem.sName).replace('\\', '/'));
            }.bind(this);
        }
        const colIcon = $('<td>').append('<i class="fa fa-' + icon + '"></i>');
        const colName = $('<td>').text(oItem.sPath);
        if (oItem.bRemovable) {
            colRemove = $('<td>').append('<i class="fa fa-remove"/>');
        }

        const tr = $('<tr>');

        utils.manageSingleDoubleClick(tr[0], funcClick, funcDblClick);
        tr.append(colIcon).append(colName);
        if (colRemove) {
            tr.append(colRemove);
        }
        return tr;
    }

    if (oParams.sDiv) {
        this.setDiv(oParams.sDiv);
    }
    if (oParams.fnItemClicked) {
        this.setItemClicked(oParams.fnItemClicked);
    }
    if (oParams.fnItemDblClicked) {
        this.setItemDblClicked(oParams.fnItemDblClicked);
    }
}
function FolderManager(oParams) {

    this.setPath = function (sPath) {
        this.sPath = sPath;
    }
    this.getPath = function () {
        return this.sPath;
    }
    this.setDiv = function (sDiv) {
        this.sDiv = sDiv;
    }
    this.setFolderChanged = function (fnFolderChanged) {
        this.fnFolderChanged = fnFolderChanged;
    }
    this.setItemClicked = function (fnItemClicked) {
        return this.fnItemClicked = fnItemClicked;
    }
    this.setItemDblClicked = function (fnItemDblClicked) {
        return this.fnItemDblClicked = fnItemDblClicked;
    }
    this.setVideosOnly = function (bVideosOnly) {
        this.bVideosOnly = bVideosOnly;

        if (this.bLoaded) {
            this.render();
        }
    }
    this.load = function () {

        this.aContent = [];
        fs.readdirSync(this.sPath).forEach(item => {
            const contentItem = new Object();;

            if (fs.lstatSync(this.sPath.replace(/\\/g, "\\\\") + "\\\\" + item).isDirectory()) {
                contentItem.bFolder = true;
            }
            switch (path.extname(item)) {
                case '.mp4' || '.avi':
                    contentItem.bVideo = true;
                    break;
                case '.jpg' || '.jpeg':
                    contentItem.bImage = true;
                    break;

                default: break;
            }
            contentItem.sName = item;
            this.aContent.push(contentItem);
        });

        this.render();

        this.bLoaded = true;

    }

    FolderManager.prototype.render = function () {

        const table = $('<table>').addClass('table');

        table.append(this.renderItem({ bFolder: true, sName: ".." }));
        this.aContent.forEach(element => {
            if (element.sName === "Thumbs.db") {
                return;
            }
            if (this.bVideosOnly && !element.bVideo && !element.bFolder) {
                return;
            }
            table.append(this.renderItem(element));
        });
        $(this.sDiv).empty();
        $(this.sDiv).append(table);
    }
    FolderManager.prototype.renderItem = function (oItem) {

        let icon, funcClick, funcDblClick;
        if (oItem.bFolder) {
            icon = 'folder';
            funcClick = function () {
                this.navigateToFolder(oItem.sName);
            }.bind(this)
        } else {
            icon = 'file';
            funcClick = function () {
                if (this.fnItemClicked) {
                    this.fnItemClicked((this.sPath + "\\" + oItem.sName).replace('\\', '/'));
                }
            }.bind(this);
            funcDblClick = function () {
                this.fnItemDblClicked((this.sPath + "\\" + oItem.sName).replace('\\', '/'));
            }.bind(this);
        }
        const colIcon = $('<td>').append('<i class="fa fa-' + icon + '"></i>');
        const colName = $('<td>').text(oItem.sName);

        const tr = $('<tr>');

        utils.manageSingleDoubleClick(tr[0], funcClick, funcDblClick);

        return tr.append(colIcon).append(colName);
    }

    FolderManager.prototype.navigateToFolder = function (sFolder) {
        this.setPath(path.resolve(this.sPath + "\\" + sFolder));
        if (this.fnFolderChanged) {
            this.fnFolderChanged(this.sPath);
        }
        this.load();

    }



    if (oParams.sPath) {
        this.setPath(oParams.sPath);
    }
    if (oParams.sDiv) {
        this.setDiv(oParams.sDiv);
    }
    if (oParams.bVideosOnly) {
        this.setVideosOnly(oParams.bVideosOnly);
    }
    if (oParams.fnFolderChanged) {
        this.setFolderChanged(oParams.fnFolderChanged);
    }
    if (oParams.fnItemClicked) {
        this.setItemClicked(oParams.fnItemClicked);
    }
    if (oParams.fnItemDblClicked) {
        this.setItemDblClicked(oParams.fnItemDblClicked);
    }
    return this;
}

const fileProcessing = {





    init: function () {
        //Define obbbjects
        this.mRootFolder = new FolderManager(
            {
                sDiv: "#divRootFolderContent",
                fnFolderChanged: function (sPath) {
                    rootFolder.value = sPath;
                },
                fnItemClicked: function (sFile) {
                    utils.displayFile(sFile);
                },
                fnItemDblClicked: function (sFile) {
                    if (this.getProcessingOption() === 'videoCompress') {
                        fileProcessing.mVideoCompressItems.addItem(sFile, true);
                    }
                }.bind(this)
            });

        this.mMergeFolder = new FolderManager(
            {
                sDiv: "#divMergeFolderContent",
                fnFolderChanged: function (sPath) {
                    mergeDestFolder.value = sPath;
                },
                fnItemClicked: function (sFile) {
                    utils.displayFile(sFile);
                }
            });
        this.mVideoCompressItems = new FSItems(
            {
                sDiv: "#divVideoCompressItems"
                // fnItemClicked: function (sFile) {
                //     utils.displayFile(sFile);
                // }
            });

        // Refresh screen
        visibility.apply();
        // Define acton handlers
        rootFolderSelect.onclick = function () {
            this.selectDirectory(rootFolder, function (oInput) {
                this.mRootFolder.setPath(oInput.value);
                this.mRootFolder.load();
            }.bind(this));
        }.bind(this);

        mergeDestFolderSelect.onclick = function () {
            this.selectDirectory(mergeDestFolder, function (oInput) {
                this.mMergeFolder.setPath(oInput.value);
                this.mMergeFolder.load();
            }.bind(this));
        }.bind(this);

        videoCompressDestFolderSelect.onclick = function () {
            this.selectDirectory(videoCompressDestFolder);
        }.bind(this);

        buttonProcess.onclick = function () {
            this.process();
        }.bind(this);

        $(".radio").each((index, element) => {
            element.addEventListener('change', function () {
                visibility.apply();

                if (this.getProcessingOption() === 'videoCompress') {
                    this.mRootFolder.setVideosOnly(true);
                    this.mVideoCompressItems.load();
                }
                if (this.getProcessingOption() === 'merge') {
                    this.mRootFolder.setVideosOnly(false);
                }
            }.bind(this));
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
    getInputFromFolderDiv: function (sDivId) {

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
    selectDirectory: function (oInput, fnCallback) {
        const dirSelector = $('<input id="directorySelector" type="file" style="display:none;" nwdirectory />');
        $('#dummy').append(dirSelector);
        directorySelector.onchange = function () {
            oInput.value = path.resolve(this.value);
            if (fnCallback) {
                fnCallback.call(this, oInput);
            }
            this.remove();
            visibility.apply();
        };
        directorySelector.oncancel = function () {
            this.remove();
        };
        directorySelector.click();
    },
}


fileProcessing.init(); 
