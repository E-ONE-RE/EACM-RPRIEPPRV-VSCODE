sap.ui.define([
    "sap/m/Button",
    "sap/m/CheckBox",
    "sap/m/Dialog",
    "sap/m/VBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/library",
    "eacm/rpriepprv/ext/controller/MessageLogHelper"
// eslint-disable-next-line max-params
], function (Button, CheckBox, Dialog, VBox, Filter, FilterOperator, JSONModel, coreLibrary, MessageLogHelper) {
    "use strict";

    // Helper unico della stampa del List Report.
    // Il dataset non viene letto dalla tabella a video: si rimandano al backend i filtri attivi.
    var SERVICE_ROOT = "/sap/opu/odata4/eacm/ui_rpriepprv_b/srvd/eacm/ui_rpriepprv/0001";

    function _toAbsoluteUrl(sUrl) {
        if (!sUrl) {
            return "";
        }

        if (/^https?:\/\//i.test(sUrl) || sUrl.startsWith("/")) {
            return sUrl;
        }

        return SERVICE_ROOT + "/" + sUrl.replace(/^\/+/, "");
    }

    async function _fetchBlob(sUrl) {
        var oResponse = await fetch(sUrl, {
            method: "GET",
            credentials: "include"
        });

        if (!oResponse.ok) {
            var oError = new Error(MessageLogHelper.i18nText("{i18n>errorPdfDownloadHTTP}" + oResponse.status + " " + oResponse.statusText));
            oError.status = oResponse.status;
            oError.responseText = await oResponse.text();
            throw oError;
        }

        return oResponse.blob();
    }

    function _buildFallbackDownloadUrls(sUrl) {
        var aUrls = [];

        if (!sUrl) {
            return aUrls;
        }

        aUrls.push(sUrl);

        // In alcuni ambienti il binario e su /Attachment, in altri su /Attachment/$value.
        if (sUrl.endsWith("/$value")) {
            aUrls.push(sUrl.slice(0, -"/$value".length));
        } else if (!sUrl.endsWith("/Attachment")) {
            aUrls.push(sUrl + "/$value");
        }

        return aUrls;
    }

    async function _downloadBlob(oBlob, sFileName) {
        var sObjectUrl = window.URL.createObjectURL(oBlob);
        var oLink = document.createElement("a");

        oLink.href = sObjectUrl;
        oLink.download = sFileName || "CommissionsList.pdf";
        // eslint-disable-next-line @sap-ux/fiori-tools/sap-no-dom-insertion, @sap-ux/fiori-tools/sap-browser-api-warning, @sap-ux/fiori-tools/sap-no-proprietary-browser-api
        document.body.appendChild(oLink);
        oLink.click();
        // eslint-disable-next-line @sap-ux/fiori-tools/sap-browser-api-warning, @sap-ux/fiori-tools/sap-no-proprietary-browser-api
        document.body.removeChild(oLink);

        // eslint-disable-next-line @sap-ux/fiori-tools/sap-timeout-usage
        window.setTimeout(function () {
            window.URL.revokeObjectURL(sObjectUrl);
        }, 1000);
    }

    function _buildOptionsModel() {
        return new JSONModel({
            DetailPrint: false,
            PrintWithDueDate: false
        });
    }

    function _openPrintOptionsDialog(oExtensionAPI) {
        // eslint-disable-next-line no-undef
        return new Promise(function (resolve) {
            var oModel = _buildOptionsModel();
            var oDialog = new Dialog({
                title: "{i18n>dialogTitle}",
                contentWidth: "26rem",
                content: new VBox({
                    items: [
                        new CheckBox({
                            text: "{i18n>printDetailText}",
                            selected: "{/DetailPrint}"
                        }),
                        new CheckBox({
                            text: "{i18n>printWithDueDate}",
                            selected: "{/PrintWithDueDate}"
                        })
                    ]
                }),
                beginButton: new Button({
                    text: "{i18n>confirmButtonText}",
                    type: "Emphasized",
                    press: function () {
                        resolve(oModel.getData());
                        oDialog.close();
                    }
                }),
                endButton: new Button({
                    text: "{i18n>cancelButtonText}",
                    press: function () {
                        resolve(null);
                        oDialog.close();
                    }
                }),
                afterClose: function () {
                    oDialog.destroy();
                }
            });

            oDialog.setModel(oModel);
            oExtensionAPI.addDependent(oDialog);
            oDialog.open();
        });
    }

    function _normalizeActiveFilters(oFilterInfo) {
        if (!oFilterInfo) {
            return [];
        }

        if (Array.isArray(oFilterInfo)) {
            return oFilterInfo.filter(Boolean);
        }

        if (Array.isArray(oFilterInfo.filters)) {
            return oFilterInfo.filters.filter(Boolean);
        }

        if (oFilterInfo.filters) {
            return [oFilterInfo.filters];
        }

        if (oFilterInfo.filter) {
            return [oFilterInfo.filter];
        }

        return [];
    }

    function _buildPdfDownloadFilters(oExtensionAPI, mOptions) {
        var aFilters = _normalizeActiveFilters(
            typeof oExtensionAPI.getFilters === "function"
                ? oExtensionAPI.getFilters()
                : null
        );

        if (!aFilters.length) {
            throw new Error(MessageLogHelper.i18nText("{i18n>errorNoFilterPrint}"));
        }

        aFilters.push(new Filter("DetailPrint", FilterOperator.EQ, !!mOptions.DetailPrint));
        aFilters.push(new Filter("PrintWithDueDate", FilterOperator.EQ, !!mOptions.PrintWithDueDate));

        return aFilters;
    }

    function _base64ToBlob(vAttachment, sMimeType) {
        var sBase64;
        var sBinary;
        var iLength;
        var aBytes;
        var iIndex;

        if (vAttachment instanceof Blob) {
            return vAttachment;
        }

        if (vAttachment instanceof Uint8Array) {
            return new Blob([vAttachment], {
                type: sMimeType || "application/pdf"
            });
        }

        sBase64 = typeof vAttachment === "string" ? vAttachment.replace(/\s/g, "") : "";
        if (!sBase64) {
            throw new Error(MessageLogHelper.i18nText("{i18n>errorPdfContent}"));
        }

        // OData V4 puo serializzare Edm.Binary in base64url:
        // atob invece vuole base64 classica con + / e padding corretto.
        sBase64 = sBase64
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        while (sBase64.length % 4 !== 0) {
            sBase64 += "=";
        }

        sBinary = window.atob(sBase64);
        iLength = sBinary.length;
        aBytes = new Uint8Array(iLength);

        for (iIndex = 0; iIndex < iLength; iIndex += 1) {
            aBytes[iIndex] = sBinary.charCodeAt(iIndex);
        }

        return new Blob([aBytes], {
            type: sMimeType || "application/pdf"
        });
    }

    function _buildAttachmentUrl(oContext, oResult) {
        var sReadLink = oResult && (oResult["Attachment@odata.mediaReadLink"] || oResult["Attachment@mediaReadLink"]);
        var sContextPath;

        if (sReadLink) {
            return _toAbsoluteUrl(sReadLink);
        }

        sContextPath = typeof oContext.getPath === "function" ? oContext.getPath() : "";
        if (!sContextPath) {
            return "";
        }

        return _toAbsoluteUrl(sContextPath.replace(/^\//, "") + "/Attachment");
    }

    async function _downloadAttachmentStream(oContext, oResult) {
        var sAttachmentUrl = _buildAttachmentUrl(oContext, oResult);
        var aCandidateUrls;
        var oLastError;
        var oBlob;

        if (!sAttachmentUrl) {
            throw new Error(MessageLogHelper.i18nText("{i18n>errorPdfLink}"));
        }

        aCandidateUrls = _buildFallbackDownloadUrls(sAttachmentUrl);

        for (const sCandidateUrl of aCandidateUrls) {
            try {
                oBlob = await _fetchBlob(sCandidateUrl);
                break;
            } catch (oError) {
                oLastError = oError;
            }
        }

        if (!oBlob) {
            throw new Error(MessageLogHelper.i18nText("{i18n>errorPdfDownload}"));
        }

        return oBlob;
    }

    async function _loadPdfFromListReport(oExtensionAPI, mOptions) {
        var oModel = oExtensionAPI.getModel();
        var aFilters = _buildPdfDownloadFilters(oExtensionAPI, mOptions);
        // Non si leggono le righe HTML gia caricate in tabella:
        // si rimandano al backend i filtri attivi, cosi il dataset e completo anche con paging server-side.
        var oListBinding = oModel.bindList("/PdfDownload", undefined, undefined, aFilters, {
            $select: "Attachment,FileName,MimeType"
        });

        try {
            MessageLogHelper.showBusy("{i18n>busyDialogText}");
            var aContexts = await oListBinding.requestContexts(0, 1);
        } catch (oError) {
            throw new Error(MessageLogHelper.i18nText("{i18n>errorPdfPrint}" + " - " + oError.message));
        } finally {
            MessageLogHelper.hideBusy();
        }
        var oContext;
        var oResult;
        var oBlob;

        if (!aContexts.length) {
            throw new Error(MessageLogHelper.i18nText("{i18n>errorNoDataFound}"));
        } else if (aContexts.length < 0) {
            throw new Error(MessageLogHelper.i18nText("{i18n>errorPdfCreation}"));
        }

        oContext = aContexts[0];
        oResult = oContext.getObject();

        if (oResult && oResult.Attachment) {
            oBlob = _base64ToBlob(oResult.Attachment, oResult && oResult.MimeType);
        } else {
            oBlob = await _downloadAttachmentStream(oContext, oResult);
        }

        return {
            blob: oBlob,
            fileName: (oResult && oResult.FileName) || "CommissionsList.pdf"
        };
    }

    return {
        // Nuovo flusso list report:
        // usa i filtri gia applicati sopra e chiede solo i 3 booleani di stampa.
        runListReportDownload: async function (oExtensionAPI) {
            var mOptions = await _openPrintOptionsDialog(oExtensionAPI);
            var oPdf;

            if (!mOptions) {
                return;
            }

            oPdf = await _loadPdfFromListReport(oExtensionAPI, mOptions);
            await _downloadBlob(oPdf.blob, oPdf.fileName);
        }
    };
});
