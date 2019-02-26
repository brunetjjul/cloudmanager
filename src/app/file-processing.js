const fs = require("fs-extra");
const path = require('path');
const gui = require('nw.gui');
const hbjs = require('handbrake-js');
const sortBy = require('sort-by');


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
        if ((!!rootFolder.value &&
            fileProcessing.getProcessingOption() === "merge" &&
            !!mergeDestFolder.value)
            ||
            (fileProcessing.getProcessingOption() === "videoCompress" &&
                fileProcessing.mVideoCompressItems.getItems().length !== 0 &&
                !!videoCompressDestFolder.value)) {
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
    bEncodeLog: false,
    moveFiles: function (src, dest) {

        fs.readdirSync(src).forEach(item => {
            if (item === "Thumbs.db") {
                return;
            }
            if (fs.lstatSync(src + '\\' + item).isDirectory()) {
                utils.moveFiles(src + '\\' + item, dest)
            } else {
                fs.moveSync(src + '\\' + item, dest + '\\' + item);
            }
        });
    },
    expandFiles: function (src, bRecurs) {
        let aFiles = [];
        fs.readdirSync(src).forEach(item => {
            if (fs.lstatSync(src + '\\' + item).isDirectory()) {
                if (bRecurs) {
                    aFiles.push(utils.expandFiles(src + '\\' + item, bRecurs))
                }
            } else {
                aFiles.push(src + '\\' + item);
            }
        });
        return aFiles;
    },
    encodeVideo: function (sInputPath, sOutputPath, sPreset, fnStatus) {
        const options = {
            input: sInputPath,
            output: sOutputPath,
            preset: sPreset
        }
        hbjs.spawn(options)
            .on('start', () => {
                if (this.bEncodeLog) {
                    console.log('started');
                }
                if (fnStatus) {
                    fnStatus.call(this, 'started');
                }
            })
            .on('begin', () => {

                if (this.bEncodeLog) {
                    console.log('begin');
                }
                if (fnStatus) {
                    fnStatus.call(this, 'begin');
                }
            })
            .on('complete', () => {
                if (this.bEncodeLog) {
                    console.log('complete')
                }
                if (fnStatus) {
                    fnStatus.call(this, 'completed');
                }
            })
            .on('error', err => {
                console.log('error' + err)
                if (fnStatus) {
                    fnStatus.call(this, 'error');
                }
            })
            .on('progress', progress => {
                if (this.bEncodeLog) {
                    console.log(
                        'Percent complete: %s, ETA: %s',
                        progress.percentComplete,
                        progress.eta
                    )
                }
                if (fnStatus) {
                    fnStatus.call(this, 'in progress', progress.percentComplete, progress.eta);
                }
            })
            .on('output', console.log)
    },
    displayFile: function (sFile) {
        gui.Shell.openItem(sFile);
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
    },
    processingSpinnerOn: function () {

        if ($("#overlay").length === 0) {
            $("body").append($('<div id="overlay">'));
        }

        $("#overlay").show();
        $("#spinner").addClass("fa-spin");
    },
    processingSpinnerOff: function () {
        $("#overlay").hide();
        $("#spinner").removeClass("fa-spin");

    },

}
function FSItems(oConfig) {

    this.aFileList = [];
    this.setConfig = function (oConfig) {
        if (oConfig.sDiv) {
            this.sDiv = oConfig.sDiv;
        }
        if (oConfig.fnItemClicked) {
            this.fnItemClicked = oConfig.fnItemClicked;
        }
        if (oConfig.fnItemDblClicked) {
            this.fnItemDblClicked = oConfig.fnItemDblClicked;
        }
        if (oConfig.bRenderOnAdd) {
            this.bRenderOnAdd = oConfig.bRenderOnAdd;
        }
        if (oConfig.bDisplayOnlyBasename) {
            this.bDisplayOnlyBasename = oConfig.bDisplayOnlyBasename;
        }
        if (oConfig.aIgnoreFiles) {
            this.aIgnoreFiles = oConfig.aIgnoreFiles;
        }
        if (typeof oConfig.bVideosOnly !== 'undefined') {
            this.bVideosOnly = oConfig.bVideosOnly;
        }
        if (typeof oConfig.bProgressRunning !== 'undefined') {
            this.bProgressRunning = oConfig.bProgressRunning;
        }
        if (oConfig.bStandardSort) {
            this.bStandardSort = oConfig.bStandardSort;
        }

    }
    this.empty = function () {
        this.aFileList = [];
        this.render();
    }
    this.getItems = function () {
        return this.aFileList;
    }


    this.fnProgressListener = function (oItem, sStatus, sPercent, sRemaining) {

        switch (sStatus) {
            case 'started':
                this.removeProgressColumn(oItem);
                this.createProgressColumn(oItem);
                break;
            case 'begin':
                this.setProgressColumnBegin(oItem);
                break;
            case 'in progress':
                this.setProgressColumnInProgress(oItem, sPercent);
                break;
            case 'error':
                this.setProgressColumnError(oItem);
                break;
            case 'completed':
                this.setProgressColumnCompleted(oItem);
                break;
            default:
                break;
        }

    }
    this.addItem = function (oItem) {
        const oAddItem = {};

        oAddItem.sPath = oItem.sPath;
        oAddItem.sPath = oItem.sPath;
        oAddItem.bRemovable = oItem.bRemovable;
        oAddItem.bDisplayOnlyBasename = oItem.bDisplayOnlyBasename;
        oAddItem.fnItemClicked = oItem.fnItemClicked;
        oAddItem.fnItemDblClicked = oItem.fnItemDblClicked;
        oAddItem.sResolvedPath = path.resolve(oItem.sPath);

        if (fs.lstatSync(oAddItem.sPath + "\\").isDirectory()) {
            oAddItem.bFolder = true;
        } else {
            oAddItem.bFolder = false;
        }
        oAddItem.sDirName = path.dirname(oAddItem.sPath);
        oAddItem.sBaseName = path.basename(oItem.sPath);
        if (oAddItem.sBaseName === '..') {
            oAddItem.sResolvedBaseName = path.basename(oItem.sPath);
        } else {
            oAddItem.sResolvedBaseName = oAddItem.sBaseName
        }
        if (oItem.bDisplayOnlyBasename || this.bDisplayOnlyBasename) {
            oAddItem.sDisplay = oAddItem.sBaseName;
        } else {
            oAddItem.sDisplay = oAddItem.sResolvedPath;
        }

        switch (path.extname(oAddItem.sPath)) {
            case '.mp4' || '.avi':
                oAddItem.bVideo = true;
                break;
            case '.jpg' || '.jpeg':
                oAddItem.bImage = true;
                break;

            default: break;
        }
        if (this.aIgnoreFiles) {
            if (this.aIgnoreFiles.filter(function (oElement) { return oElement === oAddItem.sBaseName }).length !== 0) {
                oAddItem.bIgnore = true;
            }
        }

        oAddItem.fnProgressListener = this.fnProgressListener.bind(this);
        this.aFileList.push(oAddItem);
        if (this.bRenderOnAdd || oItem.renderOnAdd) {
            this.render();
        }
    }
    this.removeItem = function (oItem) {
        this.aFileList = this.aFileList.filter(function (oElement) {
            return (oElement.sResolvedPath !== oItem.sResolvedPath)
        })
        this.render();
    }
    this.load = function () {
        this.aFileList = [];
        this.render();
    }
    FSItems.prototype.render = function () {
        // Sort before rendering
        if (this.aFileList.length !== 0 && this.bStandardSort) {
            let itemFirst;
            this.aFileList = this.aFileList.sort(sortBy('-bFolder', 'sDisplay'));
            this.aFileList = this.aFileList.filter(element => {
                if (element.sDisplay === '..') {
                    itemFirst = element;
                }
                return element.sDisplay !== '..';
            })
            if (itemFirst) {
                this.aFileList.splice(0, 0, itemFirst);
            }
        };

        // Render
        const table = $('<table>').addClass('table');
        let sId = 0;

        this.aFileList.forEach(element => {
            if (element.bIgnore) {
                return;
            }
            if (this.bVideosOnly && !element.bVideo && !element.bFolder) {
                return;
            }
            element.sId = this.sDiv + sId;
            table.append(this.renderItem(element));
            sId += 1;
        });
        $('#' + this.sDiv).empty();
        $('#' + this.sDiv).append(table);
    }
    FSItems.prototype.createProgressColumn = function (oItem) {

        const progressBar = $('<div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar"  aria-valuemin="0" aria-valuemax="100" >');
        progressBar.attr("aria-valuenow", "0");
        progressBar.width('0%');
        const progressBarCnt = $('<div class="progress">');
        progressBarCnt.width('8em');
        const progressCol = $('<td>');
        const tr = $("#" + oItem.sId);

        tr.append(progressCol.append(progressBarCnt.append(progressBar)));
    }
    FSItems.prototype.removeProgressColumn = function (oItem) {
        if ($("#" + oItem.sId + " .progress").length !== 0) {
            $("#" + oItem.sId + " .progress").parent().remove();
        }
    }
    FSItems.prototype.setProgressColumnBegin = function (oItem) {
        const progressBar = $("#" + oItem.sId + " .progress-bar");
        progressBar.text('0%');
    }
    FSItems.prototype.setProgressColumnInProgress = function (oItem, sPercent) {
        const progressBar = $("#" + oItem.sId + " .progress-bar");
        progressBar.attr("aria-valuenow", sPercent);
        progressBar.width(sPercent + '%');
        progressBar.text(sPercent + '%');
        progressBar.addClass('bg-info');
    }
    FSItems.prototype.setProgressColumnError = function (oItem) {

        const progressBar = $("#" + oItem.sId + " .progress-bar");
        progressBar.attr("aria-valuenow", "100");
        progressBar.width('100%');
        progressBar.text('Error');
        progressBar.addClass('bg-danger');
    }
    FSItems.prototype.setProgressColumnCompleted = function (oItem) {

        const progressBar = $("#" + oItem.sId + " .progress-bar");
        progressBar.attr("aria-valuenow", "100");
        progressBar.width('100%');
        progressBar.text('Completed');
        progressBar.addClass('bg-success');
    }
    FSItems.prototype.createRemoveColumn = function (oItem) {
        if (oItem.bRemovable) {
            const colRemove = $('<td>');
            colRemove[0].onclick = function (e) {
                this.removeItem(oItem);
            }.bind(this)
            colRemove.append('<i class="fa fa-remove"/>');
            return colRemove;
        }
    }
    FSItems.prototype.createNameColumn = function (oItem) {
        return $('<td>').text(oItem.sDisplay);
    }
    FSItems.prototype.createIconColumn = function (oItem) {
        let icon;
        if (oItem.bFolder) {
            icon = 'folder';
        } else {
            icon = 'file';
        }
        return $('<td>').append('<i class="fa fa-' + icon + '"></i>');
    }
    FSItems.prototype.createLine = function (oItem) {

        let funcClick, funcDblClick;
        const tr = $('<tr id=' + oItem.sId + '>');

        funcClick = function () {
            if (oItem.fnItemClicked) {
                oItem.fnItemClicked(oItem);
            } else if (this.fnItemClicked) {
                this.fnItemClicked(oItem);
            }
        }.bind(this);
        funcDblClick = function () {
            if (oItem.fnDblItemClicked) {
                oItem.fnItemDblClicked(oItem);
            } else if (this.fnItemDblClicked) {
                this.fnItemDblClicked(oItem);
            }
        }.bind(this);
        if (!oItem.bRemovable) {
            utils.manageSingleDoubleClick(tr[0], funcClick, funcDblClick);
        }
        return tr;
    }
    FSItems.prototype.renderItem = function (oItem) {


        let icon, funcClick, funcDblClick, colRemove, colName;
        line = this.createLine(oItem);
        colIcon = this.createIconColumn(oItem);
        colName = this.createNameColumn(oItem);
        colRemove = this.createRemoveColumn(oItem);


        line.append(colIcon).append(colName);
        if (colRemove) {
            line.append(colRemove);
        }
        return line;
    }

    if (oConfig) {
        this.setConfig(oConfig);
    }
}



function FolderManager(oConfig) {

    this.setVideosOnly = function (bVideosOnly) {
        this.FS.setConfig({ bVideosOnly: bVideosOnly });
        this.FS.render();
    }
    this.load = function () {
        if (!this.FS) {
            this.FS = new FSItems(
                {
                    sDiv: this.sDiv,
                    fnItemClicked: this.fnItemClicked,
                    fnItemDblClicked: this.fnItemDblClicked,
                    bDisplayOnlyBasename: true,
                    bStandardSort: true,
                    aIgnoreFiles: ["Thumbs.db"]
                });
        }


        this.FS.load();
        this.FS.addItem({
            sPath: this.sPath + "\\" + '..'
        });
        fs.readdirSync(this.sPath).forEach(item => {
            this.FS.addItem({
                sPath: this.sPath + "\\" + item
            });
        });
        this.FS.render();
    }

    this.navigateToFolder = function (sFolder) {
        this.setConfig({ sPath: path.resolve(sFolder) });
        this.load();
    }

    this.setConfig = function (oConfig) {

        if (oConfig.sPath) {
            this.sPath = oConfig.sPath;
        }
        if (oConfig.sDiv) {
            this.sDiv = oConfig.sDiv;
        }
        if (oConfig.fnFolderChanged) {
            this.fnFolderChanged = oConfig.fnFolderChanged;
        }
        if (oConfig.fnItemClicked) {
            this.fnItemClicked = oConfig.fnItemClicked;
        }
        if (oConfig.fnItemDblClicked) {
            this.fnItemDblClicked = oConfig.fnItemDblClicked;
        }


    }
    this.setConfig(oConfig);

    return this;
}

const fileProcessing = {

    init: function () {
        //Define objects
        this.mRootFolder = new FolderManager(
            {
                sDiv: "divRootFolderContent",
                fnFolderChanged: function (oItem) {
                    rootFolder.value = oItem.sPath;
                },
                fnItemClicked: function (oItem) {
                    if (oItem.bFolder) {
                        rootFolder.value = oItem.sResolvedPath;
                        this.mRootFolder.navigateToFolder(oItem.sPath);
                    } else {
                        utils.displayFile(oItem.sPath);
                    }
                }.bind(this),
                fnItemDblClicked: function (oItem) {
                    if (this.getProcessingOption() === 'videoCompress') {
                        fileProcessing.mVideoCompressItems.addItem({ sPath: oItem.sPath, bRemovable: true, bDisplayOnlyBasename: false });
                        visibility.apply();
                    }
                }.bind(this)
            });

        this.mMergeFolder = new FolderManager(
            {
                sDiv: "divMergeFolderContent",
                fnFolderChanged: function (sPath) {
                    mergeDestFolder.value = sPath;
                },
                fnItemClicked: function (oItem) {
                    if (oItem.bFolder) {
                        mergeDestFolder.value = oItem.sResolvedPath;
                        this.mMergeFolder.navigateToFolder(oItem.sPath);
                    } else {
                        utils.displayFile(oItem.sPath);
                    }
                }.bind(this),
            });
        this.mVideoCompressItems = new FSItems(
            {
                sDiv: "divVideoCompressItems",
                bRenderOnAdd: true,
                fnItemClicked: function (oItem) {
                    utils.displayFile(oItem.sPath);
                }
            });

        // Refresh screen
        visibility.apply();
        // Define acton handlers
        rootFolderSelect.onclick = function () {
            this.selectDirectory(rootFolder, function (oInput) {
                this.mRootFolder.setConfig({ sPath: oInput.value });
                this.mRootFolder.load();
            }.bind(this));
        }.bind(this);

        mergeDestFolderSelect.onclick = function () {
            this.selectDirectory(mergeDestFolder, function (oInput) {
                this.mMergeFolder.setConfig({ sPath: oInput.value });
                this.mMergeFolder.load();
            }.bind(this));
        }.bind(this);

        videoCompressDestFolderSelect.onclick = function () {
            this.selectDirectory(videoCompressDestFolder);
        }.bind(this);

        buttonProcess.onclick = function () {
            this.process();
        }.bind(this);
        btnVideoCompressRemoveAll.onclick = function () {
            this.mVideoCompressItems.empty();
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

        utils.processingSpinnerOn();

        switch (this.getProcessingOption()) {
            case "merge":
                this.merge();
                break;

            default:
                this.videoCompress(function () { utils.processingSpinnerOff(); });
                break;
        }

    },
    merge: function () {
        utils.moveFiles(rootFolder.value, mergeDestFolder.value);
        this.mMergeFolder.load();
        this.mRootFolder.load();
        alert("Success !!!")

    },
    videoCompressExpand: function () {

        this.mVideoCompressItems.getItems().forEach((element, index) => {
            if (!element.bFolder) {
                return;
            }
            this.mVideoCompressItems.removeItem(element);
            utils.expandFiles(element.sPath, checkFullScan.checked).forEach(element => {
                const ext = path.extname(element);
                if (ext === '.mp4' || ext === '.avi') {
                    this.mVideoCompressItems.addItem({ sPath: element });
                }
            });
        });
    },
    videoCompress: function (fnAtEndFunction) {

        let nNextTask = 0;
        let nTaskCount = 0;
        let aPromises = [];
        this.mVideoCompressItems.setConfig({ bProcessingRunning: true });
        this.videoCompressExpand();
        this.mVideoCompressItems.render();

        this.mVideoCompressItems.getItems().forEach((element, index) => {
            if (element.bFolder) {

            } else {

                aPromises.push(
                    new Promise(function (resolve, reject) {
                        setInterval(function () {
                            if (nNextTask !== index || nTaskCount === 2) {
                                return;
                            }
                            utils.encodeVideo(element.sResolvedPath, videoCompressDestFolder.value + '\\' + element.sBaseName, 'Normal', function (sStatus, sPercent, sRemaining) {
                                element.fnProgressListener(element, sStatus, sPercent, sRemaining);
                                if (sStatus === 'completed' || sStatus === 'error') {
                                    resolve();
                                    nTaskCount -= 1;
                                }
                            })
                            nTaskCount += 1;
                            nNextTask += 1;
                        }, 1000)
                    })
                );
            }
        });

        Promise.all(aPromises).then(() => {
            fnAtEndFunction.call( );
            alert('success')
        });
    },
    getProcessingOption: function () {
        return $("#divOptions input:checked").val();
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
            this.remove();
        };
        directorySelector.oncancel = function () {
            this.remove();
        };
        directorySelector.click();
    },
}


fileProcessing.init(); 
