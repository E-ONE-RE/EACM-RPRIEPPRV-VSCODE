sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"eacm/rpriepprv/test/integration/pages/CommissionSummaryList.gen",
	"eacm/rpriepprv/test/integration/pages/CommissionSummaryObjectPage.gen"
], function (JourneyRunner, CommissionSummaryListGenerated, CommissionSummaryObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('eacm/rpriepprv') + '/test/flp.html#app-preview',
        pages: {
			onTheCommissionSummaryListGenerated: CommissionSummaryListGenerated,
			onTheCommissionSummaryObjectPageGenerated: CommissionSummaryObjectPageGenerated
        },
        async: true
    });

    return runner;
});

