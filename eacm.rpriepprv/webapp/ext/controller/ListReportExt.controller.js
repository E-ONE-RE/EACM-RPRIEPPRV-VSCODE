sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/m/MessageBox",
    "eacm/rpriepprv/ext/controller/PrintPdfHelper",
    "eacm/rpriepprv/ext/controller/SendMailHelper",
    "eacm/rpriepprv/ext/controller/MessageLogHelper"
], function (ControllerExtension, MessageBox, PrintPdfHelper, SendMailHelper, MessageLogHelper) {
    "use strict";

    return ControllerExtension.extend("eacm.rpriepprv.ext.controller.ListReportExt", {
        override: { 
            onInit: function () { 
                MessageLogHelper.init(); 
            } 
        },
        // In lista il bottone usa i filtri gia applicati con GO
        // e chiede solo le opzioni booleane di stampa.
        downloadPdf: async function () {
            try {
                await PrintPdfHelper.runListReportDownload(this.base.getExtensionAPI());
            } catch (oError) {
                MessageBox.error(
                    oError && oError.message
                        ? oError.message
                        : "{i18n>errorPdfPrint}"
                ); // Errore durante la stampa PDF.
            }
        },
        sendMail: async function() {
            try {
                await SendMailHelper.runReportMailSending(this.base.getExtensionAPI());
            } catch (oError) {
                MessageBox.error(
                    oError && oError.message
                        ? oError.message
                        : "{i18n>errorSendMail}"
                ); // Errore durante l'invio mail.
            }
        }
    });
});
