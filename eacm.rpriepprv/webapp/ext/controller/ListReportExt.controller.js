sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/m/MessageBox",
    "eacm/rpriepprv/ext/controller/PrintPdfHelper"
], function (ControllerExtension, MessageBox, PrintPdfHelper) {
    "use strict";

    return ControllerExtension.extend("eacm.rpriepprv.ext.controller.ListReportExt", {
        // In lista il bottone usa i filtri gia applicati con GO
        // e chiede solo le opzioni booleane di stampa.
        downloadPdf: async function () {
            try {
                await PrintPdfHelper.runListReportDownload(this.base.getExtensionAPI());
            } catch (oError) {
                MessageBox.error(
                    oError && oError.message
                        ? oError.message
                        : "Errore durante la stampa PDF."
                );
            }
        }
    });
});
