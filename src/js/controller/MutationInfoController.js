/*
 * Copyright (c) 2016 Memorial Sloan-Kettering Cancer Center.
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
 * Controller class for the Mutation Diagram.
 * Listens to the various events and make necessary changes
 * on the view wrt each event type.
 *
 * @author Selcuk Onur Sumer
 */
function MutationInfoController(mainMutationView)
{
	var _mutationDiagram = null;

	function init()
	{
		// TODO if diagram is disabled, use table data instead...

		if (mainMutationView.diagramView)
		{
			diagramInitHandler(mainMutationView.diagramView.mutationDiagram);
		}
		else
		{
			mainMutationView.dispatcher.on(
				MutationDetailsEvents.DIAGRAM_INIT,
				diagramInitHandler);
		}
	}

	function diagramInitHandler(mutationDiagram)
	{
		// update class variable
		_mutationDiagram = mutationDiagram;

		// add listeners to the custom event dispatcher of the diagram
		mutationDiagram.dispatcher.on(
			MutationDetailsEvents.DIAGRAM_PLOT_RESET,
			diagramResetHandler);

		mutationDiagram.dispatcher.on(
			MutationDetailsEvents.DIAGRAM_PLOT_UPDATED,
			diagramUpdateHandler);
	}

	function diagramResetHandler()
	{
		diagramUpdateHandler();
	}

	function diagramUpdateHandler()
	{
		if (mainMutationView.infoView)
		{
			// reset all previous table filters
			mainMutationView.infoView.updateView(
				PileupUtil.countMutationsByMutationType(_mutationDiagram.pileups));
		}
	}

	init();
}
