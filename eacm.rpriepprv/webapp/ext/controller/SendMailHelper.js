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

    var MessageType = coreLibrary.MessageType;

    // Helper unico dell'invio mail per il List Report.
    // Il dataset non viene letto dalla tabella a video: si rimandano al backend i filtri attivi.

    function _buildOptionsModel() {
        return new JSONModel({
            DetailPrint: false,
            IncludeBlocked: false,
            IncludeAntMinReceived: false
        });
    }

    function _openSendOptionsDialog(oExtensionAPI) {
        // eslint-disable-next-line no-undef
        return new Promise(function (resolve) {
            var oModel = _buildOptionsModel();
            var oDialog = new Dialog({
                title: "{i18n>dialogTitle2}",
                contentWidth: "26rem",
                content: new VBox({
                    items: [
                        new CheckBox({
                            text: "{i18n>printDetailText}",
                            selected: "{/DetailPrint}"
                        }),
                        new CheckBox({
                            text: "i18n>printWithDueDate",
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

    function _buildMailSenderFilters(oExtensionAPI, mOptions) {
        var aFilters = _normalizeActiveFilters(
            typeof oExtensionAPI.getFilters === "function"
                ? oExtensionAPI.getFilters()
                : null
        );

        if (!aFilters.length) {
            var sLanguage = sap.ui.getCore().getConfiguration().getLanguage().split("-")[0];
            if (sLanguage === "it") {
               throw new Error("Non è possibile eseguire l''invio mail senza aver indicato alcun filtro"); // i18n>errorNoFilterSend
            } else {
                throw new Error("It''s not possible to send e-mails without having defined any filter"); // i18n>errorNoFilterSend
            }
       }

        aFilters.push(new Filter("DetailPrint", FilterOperator.EQ, !!mOptions.DetailPrint));
        aFilters.push(new Filter("PrintWithDueDate", FilterOperator.EQ, !!mOptions.PrintWithDueDate));

        return aFilters;
    }

    async function _sendMailFromListReport(oExtensionAPI, mOptions) {
        var oModel = oExtensionAPI.getModel();
        var aFilters = _buildMailSenderFilters(oExtensionAPI, mOptions);
        // Non si leggono le righe HTML gia caricate in tabella:
        // si rimandano al backend i filtri attivi, cosi il dataset e completo anche con paging server-side.
        var oListBinding = oModel.bindList("/MailSender", undefined, undefined, aFilters, {
            $select: "AgentCode,AgentName,StatusCode,LogMessage,ProcessedObj"
        });

        try {
            MessageLogHelper.showBusy("{i18n>busyDialogText}");
            var aContexts = await oListBinding.requestContexts(0, 0);
        } catch (oError) {
            MessageLogHelper.showMessages([{
                type: MessageType.Error,
                title: "{i18n>errorSendMail}",
                description: oError && oError.message ? oError.message : ""
            }]);
            return;
        } finally {
            MessageLogHelper.hideBusy();
        }
        var oContext;
        var oResult;
        var error = false;
		var xType = "";
		var xTitle = "";
        var xRefKey = "";
        var xDescription = "";
        var xCounter = 0;

        var aModel = [];

        if (!aContexts.length) {
            MessageLogHelper.showMessages([{
                type: MessageType.Error,
                title: "{i18n>errorNoDataFound}",
                description: "{i18n>errorVerifyFilters}"
            }]);
            return;
        } else {
            for (var i = 0; i < aContexts.length; i++) {
                xType = xTitle = xRefKey = xDescription = "";
                xCounter = 0;
                oContext = aContexts[i];
                oResult = oContext.getObject();
                if (oResult && oResult.StatusCode !== "S") {
                    error = true;
                    xType = MessageType.Error;
                } else {
                    xType = MessageType.Success;
                }
                if (oResult.AgentName !== "" && oResult.AgentName !== undefined && oResult.AgentName !== null &&
                    oResult.AgentCode !== "" && oResult.AgentCode !== undefined && oResult.AgentCode !== null ) {
                    xTitle = "Agente: " + oResult.AgentName + " - " + oResult.LogMessage;
                    xRefKey = oResult.AgentCode;
//                  xDescription = "Agente: " + oResult.AgentName + " - " + oResult.LogMessage;
                    xCounter = oResult.ProcessedObj;
                } else {
                    xTitle = oResult.LogMessage;
//                  xDescription = oResult.LogMessage;
                }
                aModel.push({
                    type: xType,
                    title: xTitle,
                    key: xRefKey,
                    description: xDescription,
                    counter: xCounter
                });
            }
        }

        if (error) {
            aModel.push({
                type: MessageType.Warning,
                title: "{i18n>mailsSentWithErrors}",
                description: "",
                counter: 0
            });
        } else {
            aModel.push({
                type: MessageType.Information,
                title: "{i18n>mailsSentSuccessfully}",
                description: "",
                counter: 0
            });
        }

        MessageLogHelper.showMessages(aModel);

    }

    return {
        // Nuovo flusso list report:
        // usa i filtri gia applicati sopra e chiede solo i 3 booleani di stampa.
        runReportMailSending: async function (oExtensionAPI) {
//          var userLang = sap.ui.getCore().getConfiguration().getLanguage();
//                         'it-IT'  'en-US'  'de-DE'  'fr-FR'  'es-ES'
            var mOptions = await _openSendOptionsDialog(oExtensionAPI);
            if (!mOptions) {
                return;
            }
            await _sendMailFromListReport(oExtensionAPI, mOptions);
        }
    };
});
