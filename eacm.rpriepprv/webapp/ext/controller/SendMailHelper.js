sap.ui.define([
    "sap/m/Button",
    "sap/m/CheckBox",
    "sap/m/Dialog",
    "sap/m/VBox",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/TextArea",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/library",
    "eacm/rpriepprv/ext/controller/MessageLogHelper"
// eslint-disable-next-line max-params
], function (Button, CheckBox, Dialog, VBox, Label, Input, TextArea, Filter, FilterOperator, JSONModel, coreLibrary, MessageLogHelper) {
    "use strict";

    var MAIL_HTTP_URL = "/sap/bc/http/EACM/RPRIEPPRV_HTTP_HDL?sap-client=100";

    var MessageType = coreLibrary.MessageType;

    // Helper unico dell'invio mail per il List Report.
    // Il dataset non viene letto dalla tabella a video: si rimandano al backend i filtri attivi.

    function _buildOptionsModel() {
        return new JSONModel({
            DetailPrint: false,
            PrintWithDueDate: false,
//          IncludeBlocked: false,
//          IncludeAntMinReceived: false,
            MailTitle: "",
            MailBody: ""
        });
    }

    function _openSendOptionsDialog(oExtensionAPI) {
        // eslint-disable-next-line no-undef
        return new Promise(function (resolve) {
            var oModel = _buildOptionsModel();
            var oDialog = new Dialog({
                title: "{i18n>dialogTitle2}",
				resizable: true,
                draggable: true,
            	contentWidth: "40%",
	            contentHeight: "60%",
                content: new VBox({
                    items: [
                        new CheckBox({
                            text: "{i18n>printDetailText}",
                            selected: "{/DetailPrint}"
                        }),
                        new CheckBox({
                            text: "{i18n>printWithDueDate}",
                            selected: "{/PrintWithDueDate}"
                        }),
                        new sap.m.FlexBox({
                            height: "20px"
                        }),
                        new Label({
                            text: "{i18n>objectText}"
                        }),
                        new Input({
                            placeholder: "{i18n>insertObject}",
                            value: "{/MailTitle}",                     
                            type: "Text",
                            required: true,
                            valueState: "Error",
                            valueStateText: "{i18n>objectRequired}",
                            width: "100%"
                        }).addStyleClass("sapUiSmallMarginBottom"),
                        new Label({
                            text: "{i18n>bodyText}"
                        }),
                        new TextArea({
                            placeholder: "{i18n>insertBody}",
                            value: "{/MailBody}",      
                            required: true,
                            valueState: "Error",
                            valueStateText: "{i18n>bodyRequired}",
                            growing: true,
                            width: "100%",
                            rows: 8
                        }).addStyleClass("sapUiSmallMarginBottom"),
                        new Label({
                            text: "{i18n>jollyText}"
                        }),
                        new TextArea({
                            value: "{i18n>jollyValues}",
                            editable: false,
                            width: "100%",
                            rows: 4
                        })
                    ]
                }),
                beginButton: new Button({
                    text: "{i18n>confirmButtonText}",
                    type: "Emphasized",
                    enabled: {
                        parts: [
                            { path: "/MailTitle" },
                            { path: "/MailBody" }
                        ],
                        formatter: function (sTitle, sBody) {
                            return !!sTitle?.trim() && !!sBody?.trim();
                        }
                    },
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
            throw new Error(MessageLogHelper.i18nText("{i18n>errorNoFilterSend}"));
       }

        return aFilters;
    }

    function _buildMailSenderFiltersJson(aFilters) {
        var aConditions = [];

        var mOperatorMap = {
            EQ: "EQ",
            NE: "NE",
            GT: "GT",
            GE: "GE",
            LT: "LT",
            LE: "LE",
            BT: "BT",
            NB: "NB",
            Contains: "CP",
            NotContains: "NP",
            StartsWith: "CP",
            EndsWith: "CP"
        };

        function _formatValue(vValue, sOperator) {
            if (vValue === null || vValue === undefined) {
                return "";
            }
            if (vValue instanceof Date) {
                return vValue.toISOString().slice(0, 10).replace(/-/g, "");
            }
            var sValue = String(vValue);
            if (sOperator === "Contains") {
                return "*" + sValue + "*";
            }
            if (sOperator === "NotContains") {
                return "*" + sValue + "*";
            }
            if (sOperator === "StartsWith") {
                return sValue + "*";
            }
            if (sOperator === "EndsWith") {
                return "*" + sValue;
            }
            return sValue;
        }

        function _processFilter(oFilter) {
            if (!oFilter) {
                return;
            }

            // Gestione di gruppi di filtri annidati
            if (Array.isArray(oFilter.aFilters) && oFilter.aFilters.length) {
                oFilter.aFilters.forEach(_processFilter);
                return;
            }

            var sPath = oFilter.sPath;
            var sOperator = oFilter.sOperator;

            if (!sPath || !sOperator) {                
                throw new Error(MessageLogHelper.i18nText("{i18n>errorUnsupportedFilter}"));
            }

            var sOption = mOperatorMap[sOperator];

            if (!sOption) {
                throw new Error(MessageLogHelper.i18nText("{i18n>errorUnsupportedOperator}") + sOperator);
            }

            aConditions.push({
                field: sPath,
                sign: "I",
                option: sOption,
                low: _formatValue(oFilter.oValue1, sOperator),
                high: _formatValue(oFilter.oValue2, sOperator)
            });
        }

        aFilters.forEach(_processFilter);

        return JSON.stringify({
            conditions: aConditions
        });
    }


    // eslint-disable-next-line max-statements, complexity
    async function _sendMailFromListReport(oExtensionAPI, mOptions) {

        var aFilters = _buildMailSenderFilters(oExtensionAPI, mOptions);

        // Conversione dei filtri UI5 nel formato atteso dal backend.
        var sFiltersJson = _buildMailSenderFiltersJson(aFilters);

        var aResults = [];

        try {
            MessageLogHelper.showBusy("{i18n>busyDialogText}");

            // Preparazione della richiesta HTTP.
            var oPayload = {
                DetailPrint: mOptions.DetailPrint,
                PrintWithDueDate: mOptions.PrintWithDueDate,
                MailTitle: mOptions.MailTitle,
                MailBody: mOptions.MailBody,
                FiltersJson: sFiltersJson
            };

            // Invocazione sincrona dal punto di vista funzionale.
            // Il backend esegue SEND_MAIL e restituisce il log completo.
            var oResponse = await fetch(MAIL_HTTP_URL, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(oPayload)
            });

            var sResponseText = await oResponse.text();
            var oResponseData;

            // Conversione della risposta JSON.
            try {
                oResponseData = JSON.parse(sResponseText);
            } catch (oParseError) {
//              throw new Error(MessageLogHelper.i18nText("{i18n>invalidHttpResponse}") + oParseError.message);
                MessageLogHelper.showMessages([{
                    type: MessageType.Error,
                    title: "{i18n>invalidHttpResponse}",
                    description: oParseError && oParseError.message ? oParseError.message : ""
                }]);
                return;
            }

            // Gestione degli errori tecnici HTTP.
            if (!oResponse.ok) {
                var sErrorMessage =
                    oResponseData && oResponseData.error
                        ? oResponseData.error
                        : sResponseText;
//              throw new Error(MessageLogHelper.i18nText("{i19n>errorHttp}") + oResponse.status + ": " + sErrorMessage);
                MessageLogHelper.showMessages([{
                    type: MessageType.Error,
                    title: "{i18n>errorHttp}" + oResponse.status,
                    description: oResponse && sErrorMessage ? sErrorMessage : ""
                }]);
                return;
            }

            // Il servizio ABAP restituisce direttamente un array JSON.
            if (Array.isArray(oResponseData)) {
                aResults = oResponseData;
            } else if (oResponseData && Array.isArray(oResponseData.value)) {
                aResults = oResponseData.value;
            } else if (oResponseData && Array.isArray(oResponseData.results)) {
                aResults = oResponseData.results;
            }

            // Normalizzazione dei nomi dei campi restituiti da ABAP.
            // La serializzazione ABAP può produrre proprietà maiuscole.
            aResults = aResults.map(function (oResult) {
                return {
                    AgentCode: oResult.AgentCode ?? oResult.AGENTCODE ?? "",
                    AgentName: oResult.AgentName ?? oResult.AGENTNAME ?? "",
                    StatusCode: oResult.StatusCode ?? oResult.STATUSCODE ?? "",
                    LogMessage: oResult.LogMessage ?? oResult.LOGMESSAGE ?? "",
                    ProcessedObj: oResult.ProcessedObj ?? oResult.PROCESSEDOBJ ?? 0
                };
            });

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

        var oResult;
        var error = false;
		var xType = "";
		var xTitle = "";
        var xRefKey = "";
        var xDescription = "";
        var xCounter = 0;
        var aModel = [];

        if (!aResults.length) {                             
            MessageLogHelper.showMessages([{
                type: MessageType.Error,
                title: "{i18n>errorNoDataFound}",
                description: "{i18n>errorVerifyFilters}"
            }]);
            return;
        } else {
            for (var i = 0; i < aResults.length; i++) {   
                xType = xTitle = xRefKey = xDescription = "";
                xCounter = 0;
                oResult = aResults[i];                              
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
