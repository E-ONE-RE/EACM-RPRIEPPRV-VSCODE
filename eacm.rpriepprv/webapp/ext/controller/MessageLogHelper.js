sap.ui.define([
	"sap/m/MessageView",
	"sap/m/MessageItem",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/BusyDialog",
	"sap/ui/core/library",
	"sap/base/i18n/ResourceBundle"
], function ( MessageView, MessageItem, Dialog, Button, BusyDialog, coreLibrary, ResourceBundle ) {
	"use strict";

	var MessageType = coreLibrary.MessageType;

	// ResourceBundle i18n dell'applicazione, valorizzato tramite init().
	var oResourceBundle = null;
	var pResourceBundle = null;

	// Bundle i18n dell'applicazione.
    // Corrisponde alla voce "bundleName" nel manifest.json
    var sBundleName = "eacm.rpriepprv.i18n.i18n";

	// BusyDialog condiviso dal modulo
	var oBusyDialog = new BusyDialog();
	
	// Verifica se si tratta di una chiave di i18n.
	function isI18nKey(sValue) {
		return typeof sValue === "string" && /^\{i18n>[^}]+\}$/.test(sValue);
	}

	// Restituisce un testo leggibile (Human-Readable).
	// Se presente la chiave i18n, ricava il testo corrispondente
	function getTextHR(sValue) {
	    if (sValue === null || sValue === undefined) {
   	   		return "";
    	}
		// Testo normale: viene restituito così com'è.
		if (!isI18nKey(sValue)) {
			return sValue;
		}
		var sKey = sValue.replace(/^\{i18n>/, "")
						 .replace(/\}$/, "");
		if (!oResourceBundle) {
			return sValue;
		}
		var sText = oResourceBundle.getText(sKey);
	    if (sText === null || sText === undefined) {
   	   		return sKey;
    	} else {
		    return oResourceBundle.getText(sKey);
		}
	}

	function exportMessages(aMessages) {
	    if (!aMessages || !aMessages.length) {
    	    return;
	    }
    	// Intestazioni CSV
	    var aHeaders = [
    	    getTextHR("{i18n>csvType}"),
        	getTextHR("{i18n>csvTitle}"),
	        getTextHR("{i18n>csvDescription}"),
    	    getTextHR("{i18n>csvKey}"),
        	getTextHR("{i18n>csvCounter}")
	    ];
    	// Escape dei valori per il formato CSV
	    var escapeCsv = function (value) {
    	    var sValue = String(value === null ? "" : value);
        	return '"' + sValue.replace(/"/g, '""') + '"';
	    };
	    // Generazione delle righe
    	var aRows = aMessages.map(function (oMessage) {
        	return [
            	oMessage.type || MessageType.Error,
	            getTextHR(oMessage.title) || getTextHR("{i18n>messageTitle}"),
    	        getTextHR(oMessage.description) || "",
        	    oMessage.key || "",
            	oMessage.counter || 0
    	    ].map(escapeCsv).join(";");
	    });
	    // BOM per garantire la corretta visualizzazione dei caratteri accentati in Excel
    	var sCsv = "\uFEFF" + aHeaders.join(";") + "\r\n" + aRows.join("\r\n");
	    // Creazione del file
    	var oBlob = new Blob([sCsv], {
        	type: "text/csv;charset=utf-8;"
	    });
	    // Download
    	var oLink = document.createElement("a");
	    var sUrl = URL.createObjectURL(oBlob);
	    oLink.href = sUrl;
		
    	oLink.download = "MessageLog_" + new Date().toISOString().replace(/[:.]/g, "-") + ".csv";
	    // eslint-disable-next-line @sap-ux/fiori-tools/sap-browser-api-warning, @sap-ux/fiori-tools/sap-no-proprietary-browser-api, @sap-ux/fiori-tools/sap-no-dom-insertion
	    document.body.appendChild(oLink);
    	oLink.click();
    	// eslint-disable-next-line @sap-ux/fiori-tools/sap-browser-api-warning, @sap-ux/fiori-tools/sap-no-proprietary-browser-api
    	document.body.removeChild(oLink);
	    URL.revokeObjectURL(sUrl);
	}	

	return {

		// Inizializza il MessageLogHelper.
		// Deve essere chiamato una volta dal Controller.
		init: function (oExtensionAPI) {
            /* Non utilizziamo:
             * - oExtensionAPI.getModel("i18n")
             * - oExtensionAPI.getAppComponent()
             * perché nel nostro runtime non sono disponibili
			 * e/o non risolvono correttamente il modello. */
            
			 // Carichiamo direttamente il ResourceBundle.
            pResourceBundle = ResourceBundle.create({
                bundleName: sBundleName,
                async: true
            }).then(function (oBundle) {
                oResourceBundle = oBundle;
                return oBundle;
            });
			return pResourceBundle;
		},

		i18nText: function(sValue) {
			return getTextHR(sValue);
		},

		/**
		 * Mostra il BusyDialog.
		 * @param {string} sText Chiave i18n per il testo del BusyDialog.
		 */
		showBusy: function (sText) {
			oBusyDialog.setTitle(getTextHR("{i18n>busyDialogTitle}"));
			oBusyDialog.setText(getTextHR(sText) || getTextHR("{i18n>busyDialogText}"));
			oBusyDialog.open();
		},
		
		// Chiude il BusyDialog.
		hideBusy: function () {
			oBusyDialog.close();
		},		

	    /**
	     * Visualizza una lista di messaggi all'interno di una popup.
	     * @param {Array} aMessages Array di oggetti messaggio.
		 */
    	showMessages: async function (aMessages) {

        	// Nessun messaggio: non deve aprire la popup
			if (!aMessages || !aMessages.length) {
    	        return;
        	}

            // Aspetta che il ResourceBundle sia disponibile.
            if (pResourceBundle) {
            	await pResourceBundle;
            } else {
				throw new Error("Call MessageLogHelper.init() to initialize the MessageLogHelper module.");
			}

	        // Creazione dei MessageItem
    	    var aMessageItems = aMessages.map(function (oMessage) {
	            return new MessageItem({
    	            type: oMessage.type || MessageType.Error,
        	        title: getTextHR(oMessage.title) || getTextHR("{i18n>messageTitle}"),
            	    description: getTextHR(oMessage.description) || "",
					subtitle: oMessage.key || "",
					counter: oMessage.counter || 0
    	        });
        	});

	        // Creazione del MessageView.
    	    // Gli item vengono passati direttamente all'aggregazione "items".
	        var oMessageView = new MessageView({
    	        items: aMessageItems
        	});

	        // Creazione della popup
    	    var oDialog = new Dialog({
        	    title: getTextHR("{i18n>messagesText}"),
            	contentWidth: "50%",
	            contentHeight: "50%",
				resizable: true,
				draggable: true,
        	    // Evita scrollbar aggiuntive del Dialog.
            	// Sarà il MessageView a gestire il proprio contenuto.
	            horizontalScrolling: false,
    	        verticalScrolling: false,
				// Contenuto della popup
        	    content: [
                	oMessageView
            	],
				// Pulsante Chiudi
	            beginButton: new Button({
    	            text: getTextHR("{i18n>closeButtonText}"),
        	        press: function () {
                    	oDialog.close();
                	}
            	}),
				// Pulsante Esporta
            	endButton: new Button({
                	text: getTextHR("{i18n>exportButtonText}"),
                	icon: "sap-icon://excel-attachment",
                	press: function () {
                    	exportMessages(aMessages);
	                }
    	        }),
				// Distrugge la popup e il MessageView quando viene chiusa
				afterClose: function () {
    	            // Distrugge Dialog e MessageView
        	        oDialog.destroy();
            	}
	        });

    	    // Apertura popup
        	oDialog.open();
		}
	};
});
