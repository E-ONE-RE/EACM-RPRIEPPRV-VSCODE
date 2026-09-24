sap.ui.define([
	"sap/m/MessageView",
	"sap/m/MessageItem",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/ui/core/library",
	"sap/m/BusyDialog"
], function ( MessageView, MessageItem, Dialog, Button, coreLibrary, BusyDialog) {
	"use strict";

	var MessageType = coreLibrary.MessageType;

	// BusyDialog condiviso dal modulo
//	var oBusyDialog = new BusyDialog({
//		title: "{i18n>busyDialogTitle}",
//		text: "{i18n>busyDialogText}"
//	});

	// ResourceBundle i18n dell'applicazione.
	// Viene valorizzato tramite init().
	var oResourceBundle = null;
	
	// BusyDialog condiviso dal modulo.
	var oBusyDialog = new BusyDialog();

	/**
	  * Verifica se si tratta di una chiave di i18n.
	  */
	function isI18nKey(sValue) {
		return typeof sValue === "string" && /^\{i18n>[^}]+\}$/.test(sValue);
	}

	/**
	  * Inizializza il MessageLogViewer.
	  * Deve essere chiamato una volta, ad esempio nel
	  * onInit() del Controller.
	  */

	return {

		/**
		  * Inizializza il MessageLogViewer.
		  * Deve essere chiamato una volta, ad esempio nel
		  * onInit() del Controller.
		  */
		init: async function (oExtensionAPI) {
			var oI18nModel = oExtensionAPI.getModel("i18n");
		    if (!oI18nModel) {
				throw new Error("MessageLogViewer.init(): i18n model not found.");
			}
			oResourceBundle = await oI18nModel.getResourceBundle();
		},

		/**
		  * Rimuove la sintassi binding i18n dalla chiave.
		  */
		getText: function(sValue) {
		    if (!sValue) {
    	   		return "";
	    	}
			if (isI18nKey(sValue)) {
			    return oResourceBundle.getText(sValue
					                           .replace(/^\{i18n>/, "")
											   .replace(/\}$/, ""));
			} else {
				return sValue;
			}
		},

		/**
		  * Mostra il BusyDialog.
		  * 
		  * @param {string} sText Chiave i18n per il testo del BusyDialog.
		  */ 

		/**
		  * Mostra il BusyDialog.
		  * 
		  * @param {string} sText Chiave i18n per il testo del BusyDialog.
		  */ 
		showBusy: function (sText) {
			if (!oResourceBundle) { 
				throw new Error("Call MessageLogViewer.init() to initialize the MessageLogViewer module.");
			}
			oBusyDialog.setTitle(oResourceBundle.getText("{i18n>busyTitle}"));
			oBusyDialog.setText(oResourceBundle.getText(sText) || oResourceBundle.getText("{i18n>busyText}"));
			oBusyDialog.open();
		},
		
		/**
		  *  Chiude il BusyDialog.
		  */
		hideBusy: function () {
			oBusyDialog.close();
		},		

	    /**
	      *  Visualizza una lista di messaggi all'interno di una popup.
	      *
	      *  @param {Array} aMessages Array di oggetti messaggio.
		  */
    	showMessages: function (aMessages) {

        	// Nessun messaggio: non aprire la popup
	        if (!Array.isArray(aMessages) || aMessages.length === 0) {
    	        return;
        	}

			if (!oResourceBundle) { 
				throw new Error("Call MessageLogViewer.init() to initialize the MessageLogViewer module.");
			}

	        // Creazione dei MessageItem
    	    var aMessageItems = aMessages.map(function (oMessage) {
	            return new MessageItem({
    	            type: oMessage.type || MessageType.Error,
        	        title: oResourceBundle.getText(oMessage.title) || oResourceBundle.getText("{i18n>messageTitle}"),
            	    description: oMessage.description || "",
					key: oMessage.key || "",
					conter: oMessage.counter || 0
    	        });
        	});

	        // Creazione del MessageView.
    	    // Gli item vengono passati direttamente
        	// all'aggregazione "items".
	        var oMessageView = new MessageView({
    	        items: aMessageItems
        	});

	        // Creazione della popup
    	    var oDialog = new Dialog({
        	    title: oResourceBundle.getText("{i18n>messagesText}"),
            	contentWidth: "50%",
	            contentHeight: "50%",
				resizable: true,

        	    // Evita scrollbar aggiuntive del Dialog.
            	// Sarà il MessageView a gestire il proprio contenuto.
	            horizontalScrolling: false,
    	        verticalScrolling: false,

        	    content: [
                	oMessageView
            	],

	            beginButton: new Button({
    	            text: oResourceBundle.getText("{i18n>closeButtonText}"),
        	        press: function () {
                    	oDialog.close();
                	}
            	}),

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
