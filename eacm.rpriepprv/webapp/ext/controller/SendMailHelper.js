tWithDueDatesap.ui.define([
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

/******************************************************************************
        aFilters.push(new Filter("DetailPrint", FilterOperator.EQ, !!mOptions.DetailPrint));
        aFilters.push(new Filter("PrintWithDueDate", FilterOperator.EQ, !!mOptions.PrintWithDueDate));
******************************************************************************/

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
                throw new Error(MessageLogHelper.i18nText("{i18n>unsupportedFilter}"));
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


    // eslint-disable-next-line max-statements
    async function _sendMailFromListReport(oExtensionAPI, mOptions) {
/******************************************************************************
***   vecchia modalità ( GET )  -->   /EACM/CL_RPRIEPPRV_MAIL_QRY  if..~Select
-------------------------------------------------------------------------------
***   nuova modalità  ( POST )  -->   /EACM/BP_R_RPRIEPPRV_MAIL    sendMail
******************************************************************************/

        var oModel = oExtensionAPI.getModel();
        var aFilters = _buildMailSenderFilters(oExtensionAPI, mOptions);
/******************************************************************************
        // Non si leggono le righe HTML gia caricate in tabella:     // * GET *
        // si rimandano al backend i filtri attivi, cosi il dataset e completo anche con paging server-side.
        var oListBinding = oModel.bindList("/MailSender", undefined, undefined, aFilters, {
            $select: "AgentCode,AgentName,StatusCode,LogMessage,ProcessedObj"
        });
-----------------------------------------------------------------------------*/
        // Prepara i filtri in un formato JSON serializzabile.      // * POST *
        // NOTA: questa funzione deve convertire i filtri UI5 in un
        // formato compatibile con FiltersJson dell'action RAP.
        var sFiltersJson = _buildMailSenderFiltersJson(aFilters);
        var aResults;
/*****************************************************************************/

        try {
            MessageLogHelper.showBusy("{i18n>busyDialogText}");
/******************************************************************************
            var aContexts = await oListBinding.requestContexts(0, 0); //* GET *
-----------------------------------------------------------------------------*/
            // Invocazione della action RAP                         // * POST *
            var oAction = oModel.bindContext("/MailSender/sendMail(...)");
            oAction.setParameter("DetailPrint", mOptions.DetailPrint);
            oAction.setParameter("PrintWithDueDate", mOptions.PrintWithDueDate);
            oAction.setParameter("MailTitle", mOptions.MailTitle);
            oAction.setParameter("MailBody", mOptions.MailBody);
            oAction.setParameter("FiltersJson", sFiltersJson);
            // Esegue la POST
            await oAction.execute();
            // Legge il risultato restituito dalla action
            var oBoundContext = oAction.getBoundContext();
            var oResultData = await oBoundContext.requestObject();
            // In base alla forma della risposta OData, i risultati possono
            // essere esposti direttamente come array oppure nella proprietà value.
            if (Array.isArray(oResultData)) {
                aResults = oResultData;
            } else if (oResultData && Array.isArray(oResultData.value)) {
                aResults = oResultData.value;
            } else if (oResultData && Array.isArray(oResultData.results)) {
                aResults = oResultData.results;
            }
/*****************************************************************************/
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
/******************************************************************************
        var oContext;                                                // * GET *
******************************************************************************/
        var oResult;
        var error = false;
		var xType = "";
		var xTitle = "";
        var xRefKey = "";
        var xDescription = "";
        var xCounter = 0;
        var aModel = [];

        if (!aResults.length) {                              //  (!aContext.length) {
            MessageLogHelper.showMessages([{
                type: MessageType.Error,
                title: "{i18n>errorNoDataFound}",
                description: "{i18n>errorVerifyFilters}"
            }]);
            return;
        } else {
            for (var i = 0; i < aResults.length; i++) {     //  for (var i = 0; i < aContext.length; i++) {
                xType = xTitle = xRefKey = xDescription = "";
                xCounter = 0;
/******************************************************************************
                oContext = aContexts[i];                             // * GET *
                oResult = oContext.getObject();
-----------------------------------------------------------------------------*/
                oResult = aResults[i];                              // * POST *
/*****************************************************************************/
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
