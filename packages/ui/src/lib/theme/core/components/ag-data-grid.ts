import { iconOverrides, themeQuartz } from 'ag-grid-community';

import { Theme } from '@mui/material/styles';

const mySvgIcons = iconOverrides({
    type: 'image',
    mask: true,
    icons: {
        // map of icon names to images
        'filter': { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.414 0-2.121 0-2.56.412S2 4.488 2 5.815v.69c0 1.037 0 1.556.26 1.986s.733.698 1.682 1.232l2.913 1.64c.636.358.955.537 1.183.735c.474.411.766.895.898 1.49c.064.284.064.618.064 1.285v2.67c0 .909 0 1.364.252 1.718c.252.355.7.53 1.594.88c1.879.734 2.818 1.101 3.486.683S15 19.452 15 17.542v-2.67c0-.666 0-1 .064-1.285a2.68 2.68 0 0 1 .899-1.49c.227-.197.546-.376 1.182-.735l2.913-1.64c.948-.533 1.423-.8 1.682-1.23c.26-.43.26-.95.26-1.988v-.69c0-1.326 0-1.99-.44-2.402C21.122 3 20.415 3 19 3"/></svg>' },
        'asc': { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m8.303 11.596l3.327-3.431a.5.5 0 0 1 .74 0l6.43 6.63c.401.414.158 1.205-.37 1.205h-5.723z"/><path fill="currentColor" d="M11.293 16H5.57c-.528 0-.771-.791-.37-1.205l2.406-2.482z" opacity="0.5"/></svg>' },
        'desc': { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m8.303 12.404l3.327 3.431c.213.22.527.22.74 0l6.43-6.63C19.201 8.79 18.958 8 18.43 8h-5.723z"/><path fill="currentColor" d="M11.293 8H5.57c-.528 0-.771.79-.37 1.205l2.406 2.481z" opacity="0.5"/></svg>' },
        'small-down': { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m19 9l-7 6l-7-6"/></svg>' },
    }
});


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const agDataGridTheme = (muiTheme: Theme): any => themeQuartz.withPart(
        mySvgIcons).withParams({
            fontFamily: muiTheme.typography.fontFamily,
            borderWidth: 0,
            backgroundColor: muiTheme.vars.palette.background.paper,
            columnBorder: 'var(--DataGrid-rowBorderColor)',
            headerBackgroundColor: muiTheme.vars.palette.background.neutral,
            headerTextColor: muiTheme.palette.text.secondary,
            headerFontSize: 14,
            headerFontWeight: 600,
            headerRowBorder: {
                style: 'solid',
                width: 1,
                color: muiTheme.vars.palette.divider
            },
            foregroundColor: muiTheme.vars.palette.text.primary,
            rowHeight: 60,
            fontSize: 14,
            accentColor: muiTheme.vars.palette.primary.main,
            wrapperBorder: false,
            rowBorder: true,
            iconSize: 14,
            paginationPanelHeight: 64
            
        })
 
    //     /* Core colours */
    //     backgroundColor: muiTheme.vars.palette.background.default,
    //     foregroundColor: muiTheme.vars.palette.text.primary,
    //     borderColor: muiTheme.vars.palette.divider,
    //     accentColor: muiTheme.vars.palette.primary.main,

    //     /* Typography */
    //     fontFamily: muiTheme.typography.fontFamily,
    //     fontSize: 14,

    //     /* Header (columnHeader) */
    //     headerBackgroundColor: muiTheme.vars.palette.background.neutral,
    //     headerTextColor: muiTheme.vars.palette.text.secondary,
    //     headerFontWeight: muiTheme.typography.fontWeightSemiBold,
    //     headerHeight: 45,

    //     /* Rows */
    //     rowHeight: 70,
    //     oddRowBackgroundColor: muiTheme.vars.palette.background.default,
    //     rowHoverColor: muiTheme.vars.palette.action.hover,
    //     selectedRowBackgroundColor: varAlpha(
    //         muiTheme.vars.palette.primary.mainChannel,
    //         0.08
    //     ),

    //     /* Borders – dashed horizontal only (vertical borders disabled) */
    //     cellHorizontalBorder: {
    //         width: 1,
    //         style: 'dashed',
    //         color: muiTheme.vars.palette.divider,
    //     },
    //     cellVerticalBorder: false,
    //     headerRowBorder: false,

    //     /* Misc spacing */
    //     spacing: 16,
    // });

export const agDataGrid: { agDataGridTheme: typeof agDataGridTheme } = { agDataGridTheme };
