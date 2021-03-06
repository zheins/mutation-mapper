/*
 * Copyright (c) 2015 Memorial Sloan-Kettering Cancer Center.
 *
 * This library is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS
 * FOR A PARTICULAR PURPOSE. The software and documentation provided hereunder
 * is on an "as is" basis, and Memorial Sloan-Kettering Cancer Center has no
 * obligations to provide maintenance, support, updates, enhancements or
 * modifications. In no event shall Memorial Sloan-Kettering Cancer Center be
 * liable to any party for direct, indirect, special, incidental or
 * consequential damages, including lost profits, arising out of the use of this
 * software and its documentation, even if Memorial Sloan-Kettering Cancer
 * Center has been advised of the possibility of such damage.
 */

/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Controller class for the Mutation Details view.
 *
 * @author Selcuk Onur Sumer
 */
function MutationDetailsController(
	mutationDetailsView, dataProxies, sampleArray, diagramOpts, tableOpts, mut3dVis)
{
	var mutationProxy = dataProxies.mutationProxy;
	var pfamProxy = dataProxies.pfamProxy;
	var pdbProxy = dataProxies.pdbProxy;

	var _geneTabView = {};

	// a single 3D view instance shared by all MainMutationView instances
	var _mut3dVisView = null;

	function init()
	{
		// add listeners to the custom event dispatcher of the view
		mutationDetailsView.dispatcher.on(
			MutationDetailsEvents.GENE_TAB_SELECTED,
			geneTabSelectHandler);

		mutationDetailsView.dispatcher.on(
			MutationDetailsEvents.GENE_TABS_CREATED,
			geneTabCreateHandler);
	}

	function geneTabSelectHandler(gene)
	{
		if (_geneTabView[gene] == null)
		{
			initView(gene, sampleArray, diagramOpts, tableOpts);
		}
	}

	function geneTabCreateHandler()
	{
		// init 3D view if the visualizer is available

		var container3d = mutationDetailsView.$el.find(".mutation-3d-container");

		if (mut3dVis)
		{
			// TODO remove mutationProxy?
			var mutation3dVisView = new Mutation3dVisView(
				{el: container3d,
					mut3dVis: mut3dVis,
					pdbProxy: pdbProxy,
					mutationProxy: mutationProxy});

			mutation3dVisView.render();

			// update reference to the 3d vis view
			_mut3dVisView = mutation3dVisView;
		}
		// if no visualizer, hide the 3D vis container
		else
		{
			$(container3d).hide();
		}

		// init the view for the first gene only

		var genes = mutationProxy.getGeneList();

		initView(genes[0], sampleArray, diagramOpts, tableOpts);
	}

	/**
	 * Initializes mutation view for the given gene and cases.
	 *
	 * @param gene          hugo gene symbol
     * @param cases         array of case ids (samples)
     * @param diagramOpts   [optional] mutation diagram options
     * @param tableOpts     [optional] mutation table options
	 */
	function initView(gene, cases, diagramOpts, tableOpts)
	{
		// callback function to init view after retrieving
		// sequence information.
		var init = function(sequenceData, mutationData, pdbRowData)
		{
			// process data to add 3D match information
			mutationData = processMutationData(mutationData,
			                                   mutationProxy.getMutationUtil(),
			                                   pdbRowData);

			// TODO a new util for each instance instead?
//			var mutationUtil = new MutationDetailsUtil(
//				new MutationCollection(mutationData));
			var mutationUtil = mutationProxy.getMutationUtil();

			// prepare data for mutation view
			var model = {geneSymbol: gene,
				mutationData: mutationData,
				dataProxies: dataProxies,
				sequence: sequenceData,
				sampleArray: cases,
				diagramOpts: diagramOpts,
				tableOpts: tableOpts};

			// init the main view
			var mainView = new MainMutationView({
				el: "#mutation_details_" + cbio.util.safeProperty(gene),
				model: model});

			mainView.render();

			// update the reference after rendering the view
			_geneTabView[gene].mainMutationView = mainView;

			// TODO this can be implemented in a better way in the MainMutationView class
			var components = mainView.initComponents(_mut3dVisView);

			if (mutationData == null ||
			    mutationData.length == 0)
			{
				mainView.showNoDataInfo();
				components.tableView.hideView();
			}

			// TODO init controllers in their corresponding view classes' init() method instead?

			// init controllers
			new MainMutationController(mainView, components.diagram);
			new MutationDetailsTableController(
				components.tableView, components.diagram, mutationDetailsView);

			if (mut3dVis &&
			    _mut3dVisView)
			{
				new Mutation3dController(mutationDetailsView, mainView,
					_mut3dVisView, components.view3d, mut3dVis,
					pdbProxy, mutationUtil,
					components.diagram, components.tableView.tableUtil, gene);
			}

			new MutationDiagramController(
				components.diagram, components.tableView.tableUtil, mutationUtil);
		};

		// get mutation data for the current gene
		mutationProxy.getMutationData(gene, function(data) {
			// init reference mapping
			_geneTabView[gene] = {};

			// create an empty array if data is null
			if (data == null)
			{
				data = [];
			}

			// get the sequence data for the current gene & init view

			// get the most frequent uniprot accession string (excluding "NA")
			var uniprotInfo = mutationProxy.getMutationUtil().dataFieldCount(
				gene, "uniprotAcc", ["NA"]);

			var uniprotAcc = null;
			var servletParams = {geneSymbol: gene};

			if (uniprotInfo.length > 0)
			{
				uniprotAcc = uniprotInfo[0].uniprotAcc;
			}

			// if exists, also add uniprotAcc to the servlet params
			if (uniprotAcc)
			{
				servletParams.uniprotAcc = uniprotAcc;
			}

			pfamProxy.getPfamData(servletParams, function(sequenceData) {
				// sequenceData may be null for unknown genes...
				if (sequenceData == null)
				{
					console.log("[warning] no pfam data found: %o", servletParams);
					return;
				}

				// get the first sequence from the response
				var sequence = sequenceData[0];

				if (pdbProxy)
				{
					var uniprotId = sequence.metadata.identifier;
					pdbProxy.getPdbRowData(uniprotId, function(pdbRowData) {
						init(sequence, data, pdbRowData);
					});
				}
				else
				{
					init(sequence, data);
				}

			});
		});
	}

	/**
	 * Processes mutation data to add additional information.
	 *
	 * @param mutationData  raw mutation data array
	 * @param mutationUtil  mutation util
	 * @param pdbRowData    pdb row data for the corresponding uniprot id
	 * @return {Array}      mutation data array with additional attrs
	 */
	function processMutationData(mutationData, mutationUtil, pdbRowData)
	{
		if (!pdbRowData)
		{
			return mutationData;
		}

		var map = mutationUtil.getMutationIdMap();

		_.each(mutationData, function(mutation, idx) {
			if (mutation == null)
			{
				console.log('warning [processMutationData]: mutation (at index %d) is null.', idx);
				return;
			}

			// use model instance, since raw mutation data won't work with mutationToPdb
			var mutationModel = map[mutation.mutationId];
			// find the matching pdb
			var match = PdbDataUtil.mutationToPdb(mutationModel, pdbRowData);
			// update the raw mutation object
			mutation.pdbMatch = match;
			// also update the corresponding MutationModel within the util
			mutationModel.pdbMatch = match;
		});

		return mutationData;
	}

	init();
}
