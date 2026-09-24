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

	// ResourceBundle i18n dell'applicazione.
	// Viene valorizzato tramite init().
	var oResourceBundle = null;
	var pResourceBundle = null;

	/**
      * Bundle i18n dell'applicazione.
      * Corrisponde nel manifest.json a:
      * "bundleName": "eacm.rpriepprv.i18n.i18n"
      */
    var sBundleName = "eacm.rpriepprv.i18n.i18n";

	// BusyDialog condiviso dal modulo
	var oBusyDialog = new BusyDialog();
//	var oBusyDialog = new BusyDialog({
//		title: "{i18n>busyDialogTitle}",
//		text: "{i18n>busyDialogText}"
//	});
	
	/**
	  * Verifica se si tratta di una chiave di i18n.
	  */
	function isI18nKey(sValue) {
		return typeof sValue === "string" && /^\{i18n>[^}]+\}$/.test(sValue);
	}

	/**
	  * Rimuove la sintassi binding i18n dalla chiave.
	  */
	function getText(sValue) {
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
	    return oResourceBundle.getText(sKey);
	}

	return {

		/**
		  * Inizializza il MessageLogViewer.
		  * Deve essere chiamato una volta, ad esempio nel
		  * onInit() del Controller.
		  */
		init: function (oExtensionAPI) {
            /**
              * Non utilizziamo:
              *
              * oExtensionAPI.getModel("i18n")
              * oExtensionAPI.getAppComponent()
              *
              * perché nel nostro runtime non sono disponibili/risolvono
              * correttamente il modello.
              *
              * Carichiamo direttamente il ResourceBundle.
              */
            pResourceBundle = ResourceBundle.create({
                bundleName: sBundleName,
                async: true
            }).then(function (oBundle) {
                oResourceBundle = oBundle;
                return oBundle;
            });
			return pResourceBundle;
		},

		/**
		  * Mostra il BusyDialog.
		  * 
		  * @param {string} sText Chiave i18n per il testo del BusyDialog.
		  */ 
		showBusy: function (sText) {
///			if (!oResourceBundle) { 
//				throw new Error("Call MessageLogViewer.init() to initialize the MessageLogViewer module.");
//			}
//			oBusyDialog.setTitle(oResourceBundle.getText("{i18n>busyTitle}"));
			oBusyDialog.setTitle(getText("{i18n>busyTitle}"));
//			oBusyDialog.setText(oResourceBundle.getText(sText) || oResourceBundle.getText("{i18n>busyText}"));
			oBusyDialog.setText(getText(sText) || getText("{i18n>busyText}"));
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
    	showMessages: async function (aMessages) {

        	// Nessun messaggio: non aprire la popup
//	        if (!Array.isArray(aMessages) || aMessages.length === 0) {
			if (!aMessages || !aMessages.length) {
    	        return;
        	}

            // Aspetta che il ResourceBundle sia disponibile.
            // Se init() è già terminato, la Promise è già risolta.
            if (pResourceBundle) {
            	await pResourceBundle;
            } else {
				throw new Error("Call MessageLogViewer.init() to initialize the MessageLogViewer module.");
			}

	        // Creazione dei MessageItem
    	    var aMessageItems = aMessages.map(function (oMessage) {
	            return new MessageItem({
    	            type: oMessage.type || MessageType.Error,
//        	        title: oResourceBundle.getText(oMessage.title) || oResourceBundle.getText("{i18n>messageTitle}"),
        	        title: getText(oMessage.title) || getText("{i18n>messageTitle}"),
            	    description: getText(oMessage.description) || "",
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
//        	    title: oResourceBundle.getText("{i18n>messagesText}"),
        	    title: getText("{i18n>messagesText}"),
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
//    	            text: oResourceBundle.getText("{i18n>closeButtonText}"),
    	            text: getText("{i18n>closeButtonText}"),
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
