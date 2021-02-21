var FMApp = angular.module("FMApp", ["ur.file"]);

FMApp.controller("FileManagerCtr", [
    "$scope",
    "$http",
    "$location",
    function($scope, $http, $location) {
        var FM = this;
        FM.curHashPath = "#/"; // hash in browser url
        FM.curFolderPath = "/"; // current relative folder path
        FM.curBreadCrumbPaths = []; // items in breadcrumb list, for each level folder
        FM.curFiles = []; // files in current folder

        FM.selecteAll = false; // if select all files
        FM.selection = []; // selected files
        FM.renameName = ""; // new name for rename action
        FM.uploadFile = null; // will upload file
        FM.newFolderName = "";
        FM.successData = "__init__";
        FM.errorData = "__init__";
        FM.showAllFiles = false;
        FM.updateArchiveName = function() {
            FM.archiveTarget =
                "files_" +
                FM.curFolderPath.substring(1).replace(/\//g, "_") +
                new Date().toISOString().replace(/:/g, ".") +
                ".zip";
        };
        FM.fileFilter = '';

        var hash2paths = function(relPath) {
            var paths = [];
            var names = relPath.split("/");
            var path = "#/";
            paths.push({ name: "Home", path: path });
            for (var i = 0; i < names.length; ++i) {
                var name = names[i];
                if (name) {
                    path = path + name + "/";
                    paths.push({ name: name, path: path });
                }
            }
            return paths;
        };

        var humanSize = function(size) {
            var hz;
            if (size < 1024) hz = size + " B";
            else if (size < 1024 * 1024) hz = (size / 1024).toFixed(2) + " KB";
            else if (size < 1024 * 1024 * 1024)
                hz = (size / 1024 / 1024).toFixed(2) + " MB";
            else hz = (size / 1024 / 1024 / 1024).toFixed(2) + " GB";
            return hz;
        };

        var humanTime = function(timestamp) {
            var t = new Date(timestamp);
            return t.toLocaleDateString() + " " + t.toLocaleTimeString();
        };

        var setCurFiles = function(relPath) {
            $http
                .get("api" + relPath)
                .then(function(response) {
                    var files = response.data;
                    files.forEach(function(file) {
                        file.relPath = relPath + encodeURIComponent(file.name);
                        if (file.folder) file.relPath += "/";
                        file.selected = false;
                        file.humanSize = humanSize(file.size);
                        file.humanTime = humanTime(file.mtime);
                    });
                    FM.curFiles = files;
                    // console.log("Current Files:");
                    // console.log(FM.curFiles);
                },
                function(response) {
                    alert("Error: " + response.status + ': ' + response.data);
                });
        };

        var handleHashChange = function(hash) {
            if (!hash) {
                return $location.path("/");
            }
            // console.log("Hash change: " + hash);
            var relPath = hash.slice(1);
            FM.curHashPath = hash;
            FM.curFolderPath = relPath;
            FM.curBreadCrumbPaths = hash2paths(relPath);
            setCurFiles(relPath);
        };

        $scope.$watch(
            function() {
                return location.hash;
            },
            function(val) {
                handleHashChange(val);
            }
        );

        // listening on file checkbox
        $scope.$watch(
            "FM.curFiles|filter:{selected:true}",
            function(nv) {
                FM.selection = nv.map(function(file) {
                    return file;
                });
            },
            true
        );

        $scope.$watch("FM.selectAll", function(nv) {
            FM.curFiles.forEach(function(file) {
                file.selected = nv;
            });
        });

        FM.toggleShowAllFiles = function() {
            FM.showAllFiles = !FM.showAllFiles;
            var conf = {
                method: "PUT",
                url: "api/options",
                params: { type: "SHOW_ALL_FILES" + (FM.showAllFiles ? '_ON' : '_OFF') },
                data: null,
                timeout: 10000
            };
            $http(conf)
                .then(function(response) {
                    FM.showAllFiles = response.data;
                    handleHashChange(FM.curHashPath);
                },
                function(response) {
                    FM.errorData = " " + response.status + ": " + response.data;
                });
        };

        FM.getShowAllFiles = function() {
            var conf = {
                method: "PUT",
                url: "api/options",
                params: { type: "GET_SHOW_ALL_FILES" },
                data: null,
                timeout: 10000
            };
            $http(conf)
                .then(function(response) {
                    FM.showAllFiles = response.data;
                },
                function(response) {
                    FM.errorData = " " + response.status + ": " + response.data;
                });
        };

        FM.getFileFilter = function() {
            var conf = {
                method: "PUT",
                url: "api/options",
                params: { type: "GET_FILE_FILTER" },
                data: null,
                timeout: 10000
            };
            $http(conf)
                .then(function(response) {
                    FM.fileFilter = response.data ? '.' + response.data.replace(/\*/g, '').replace(/\|/g, ',.') : '';
                    FM.successData = 'Filter: ' + response.data;
                },
                function(response) {
                    FM.errorData = " " + response.status + ": " + response.data;
                });
        };

        var newToast = function newToast(title, content, autohide = true , type = 'info') {
            var $t = $("#toast-template").clone().removeAttr('id').prependTo('#toast-container');
            $('.rounded', $t).addClass(type);
            $('.toast-title', $t).html(title);
            $('.toast-body', $t).html(typeof content == 'string' ? content : JSON.stringify(content));
            $t.toast({ delay: 4000, autohide: autohide }).toast('show');
        };

        $scope.$watch("FM.successData", function() {
            if (FM.successData === "__init__") return;
            newToast('Info', FM.successData);
        });

        $scope.$watch("FM.errorData", function() {
            if (FM.errorData === "__init__") return;
            newToast('Error', FM.errorData, false, 'error');
        });

        var httpRequest = function(method, url, params, data, config) {
            var conf = {
                method: method,
                url: url,
                params: params,
                data: data,
                timeout: 10000
            };
            for (var k in config) {
                if (config.hasOwnProperty(k)) {
                    conf[k] = config[k];
                }
            }
            console.log("request url", url);
            $http(conf)
                .then(function(response) {
                    FM.successData = response.data;
                    handleHashChange(FM.curHashPath);
                },
                function(response) {
                    FM.errorData = " " + response.status + ": " + response.data;
                });
        };

        var downloadFile = function(file) {
            window.open("api" + file.relPath);
        };

        FM.clickFile = function(file) {
            if (file.folder) {
                // open folder by setting url hash
                $location.path(decodeURIComponent(file.relPath));
            } else {
                // download file
                downloadFile(file);
            }
        };

        FM.download = function() {
            // Technique for downloading multiple files adapted from here:
            //  [1] http://stackoverflow.com/questions/2339440/download-multiple-files-with-a-single-action

            var link = document.createElement("a");
            link.style.display = "none";
            document.body.appendChild(link);

            for (var i in FM.selection) {
                link.setAttribute("href", "api" + FM.selection[i].relPath);
                link.setAttribute("download", FM.selection[i].name);
                link.click();
            }

            document.body.removeChild(link);
        };

        FM.delete = function() {
            for (var i in FM.selection) {
                var relPath = FM.selection[i].relPath;
                var url = "api" + relPath;
                httpRequest("DELETE", url, null, null);
            }
        };

        FM.move = function(target) {
            var url = "api" + encodeURI(target);
            var src = FM.selection.map(function(file) {
                return file.relPath;
            });
            httpRequest("PUT", url, { type: "MOVE" }, { src: src });
        };

        FM.archive = function(archive) {
            if (!archive.match(/\.zip$/)) {
                archive += ".zip";
            }
            var url = "api" + FM.curFolderPath + encodeURI(archive);
            var src = FM.selection.map(function(file) {
                return file.relPath;
            });
            httpRequest(
                "POST",
                url,
                { type: "CREATE_ARCHIVE" },
                { src: src, embedDirs: FM.archiveEmbedDirs }
            );
        };

        FM.rename = function(newName) {
            var url = "api" + FM.selection[0].relPath;
            var target = FM.curFolderPath + encodeURI(newName);
            // console.log("rename target", target);
            httpRequest("PUT", url, { type: "RENAME" }, { target: target });
        };

        FM.createFolder = function(folderName) {
            var url = "api" + FM.curFolderPath + encodeURI(folderName);
            httpRequest("POST", url, { type: "CREATE_FOLDER" }, null);
        };

        FM.upload = function() {
            // console.log("Upload File:", FM.uploadFile);
            for (uploadFile of FM.uploadFile) {
                var formData = new FormData();
                formData.append("upload", uploadFile);
                var url = "api" + FM.curFolderPath + encodeURI(uploadFile.name);
                httpRequest("POST", url, { type: "UPLOAD_FILE" }, formData, {
                    transformRequest: angular.identity,
                    headers: { "Content-Type": undefined }
                });
            }
        };

        FM.btnDisabled = function(btnName) {
            switch (btnName) {
                case "download":
                    if (FM.selection.length === 0) return true;
                    else {
                        for (var i in FM.selection) {
                            if (FM.selection[i].folder) return true;
                        }
                        return false;
                    }
                case "delete":
                case "move":
                case "archive":
                    return FM.selection.length === 0;
                case "rename":
                    return FM.selection.length !== 1;
                case "upload_file":
                case "create_folder":
                    return false;
                default:
                    return true;
            }
        };


        FM.getShowAllFiles();
        FM.getFileFilter();
    }
]);
