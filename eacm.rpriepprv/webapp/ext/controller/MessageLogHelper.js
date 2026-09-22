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
	var oBusyDialog = new BusyDialog({
		title: "{i18n>busyDialogTitle}",
		text: "{i18n>busyDialogText}"
	});

	return {

		/**
		  * Mostra il BusyDialog
		  */ 
		showBusy: function (sText) {
			if (sText) { 
				oBusyDialog.setText(sText);
			}
			oBusyDialog.open();
		}, 
		
		/**
		  *  Chiude il BusyDialog
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

	        // Creazione dei MessageItem
    	    var aMessageItems = aMessages.map(function (oMessage) {

            return new MessageItem({
                type: oMessage.type || MessageType.Error,
                title: oMessage.title || "{i18n>messageTitle}",
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
            title: "{i18n>messagesText}",
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
                text: "{i18n>closeButtonText}",
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
