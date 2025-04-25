import { MiniDOM }              from './minidom.ts';
import { taskForces, location } from "./params.ts";
import * as fs                  from 'node:fs/promises';
import * as path                from 'node:path';

type FileName = string;

/** The data extracted from the minutes that is supposed to be displayed */
interface DisplayedData {
    /** The File name of the minutes */
    fname: FileName;
    /** The final path to the minutes, to be used for links */
    location: FileName
    /** Date of the minutes */
    date: Date;
    /** Array of TOC entries (can be HTML) */
    toc: string[];
    /** Array of Resolution entries entries (can be HTML) */
    res: string[];
}

/** The data regrouped per years */
export type GroupedData   = Map<number, DisplayedData[]>;
export type GroupedTFData = Map<string, GroupedData>;

/** 
 * Files names that must be ignored in the directory of minutes, if there are present 
 */
const ignoredFiles: string[] = ["index.html", "resolutions.html"];

/**
 * Get the file names of all the minutes for a given WG.
 * The file names are relative to the directory.
 * 
 * 
 * @param directory
 * @returns 
 */
async function getMinutes(directory: string): Promise<FileName[]> {
    return (await fs.readdir(directory))
        .filter(file => !ignoredFiles.includes(file))   
        .map(file => `${directory}/${file}`);
}

/**
 * Get all TOCs and resolutions with the respective date; one block each that can 
 * be displayed in the generated HTML
 * 
 * @param minutes 
 * @returns 
 */
async function getAllData(minutes: FileName[]): Promise<DisplayedData[]> {
    /*
     * Extract a list of <li> entries from the content of a minutes file, using a CSS selector.
     */
    const extractListEntries = (fname: FileName, content: MiniDOM, selector: string): string[] => {
        // There is only one cleanup operation for now, but it could be extended if needed
        const cleanupData = (nav: string): string => {
            return nav
                // References should not be relative
                .replace(/href="#/g, `target="_blank" href="${path.join(location, path.basename(fname))}#`)
                ;
        };

        const resLines: NodeListOf<Element> = content.querySelectorAll(selector);

        if (resLines.length === 0) {
            return [];
        } else {
            return Array.from(resLines)
                // Get the HTML line corresponding to an 'li' element
                .map((line: Element) => line.innerHTML)
                // Cleanup each the line before returning it
                .map(cleanupData);
        }
    }

    // Get the data for a single entry; the Promises are collected in an array
    // for a parallel execution via Promise.allSettled.
    const retrieveDisplayData = async (fname: FileName): Promise<DisplayedData> => {
        // Get the minutes file as a text
        const response = await fs.readFile(fname, "utf-8");
        // Parse the (HTML) text into a MiniDOM
        const content  = new MiniDOM(response);

        // Find the date of the minutes
        const date_title :string | null | undefined  = content.querySelector("header h2:first-of-type")?.textContent;
        const date       = new Date(date_title ?? "1970-01-01");

        // console.log(`Processing ${fname}, ${path.basename(fname)}, ${path.join(location, path.basename(fname))}`);

        return {
            fname    : fname,
            location : path.join(location, path.basename(fname)),
            date     : date,
            toc      : extractListEntries(fname, content, "#toc > ol > li"),  
            res      : extractListEntries(fname, content, "#ResolutionSummary ol li"), 
        };
    }

    // Gather all the Promises for a parallel execution
    const promises: Promise<DisplayedData>[] = minutes.map(retrieveDisplayData);

    // Some of the promises might have failed, so we need to filter those out.
    // But we want to display everything we can...
    const results : PromiseSettledResult<DisplayedData>[] = await Promise.allSettled(promises);
    const output = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);

    // Sorting the output by date before returning it
    return output.sort((a, b) => {
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
        else return 0;
    });    
}


/**
 * Main entry point to get the Data grouped by year. The data themselves are arrays of strings, in HTML format.
 * 
 * @param directory 
 * @returns 
 */
export async function getGroupedData(directory: string): Promise<GroupedData> {
    const groupDisplayedDataByYear = (data: DisplayedData[]): GroupedData => {
        const groups: GroupedData = new Map<number, DisplayedData[]>();
        for (const entry of data) {
            const year = entry.date.getFullYear();
            if (!groups.has(year)) {
                groups.set(year, []);
            }
            groups.get(year)?.push(entry);
        }
        return groups;
    }

    // Get the references to all the minutes
    const minutes: FileName[]      = await getMinutes(directory);
    // For each of the minutes, get the content.
    const display: DisplayedData[] = await getAllData(minutes);
    return groupDisplayedDataByYear(display);
}

/**
 * Take care of task forces and group the data accordingly.
 * 
 * @param groupedData 
 * @returns 
 */
export async function getTFGroupedData(directory: string): Promise<GroupedTFData> {
    const groupedData = await getGroupedData(directory);
    const groups: GroupedTFData = new Map<string, GroupedData>();

    for (const tf of Object.keys(taskForces)) {
        const group = new Map<number, DisplayedData[]>();
        let groupEmpty = true;
        for (const [year, data] of groupedData) {
            const filteredData = data.filter((entry: DisplayedData): boolean =>  {
                const baseName = entry.fname.split(".html")[0];
                const parts = baseName.split("-");
                // the convention is that the last part is the task force identifier
                // which follows the the date string
                if (parts.length === 3 && tf === "default") {
                    // if the task force is not specified, we take the default
                    return true;
                } else {
                    // if the task force is specified, we take that one
                    return parts[parts.length - 1] === tf;  
                }
            })
            if (filteredData.length > 0) {
                group.set(year, filteredData);
                groupEmpty = false;
            }
        }
        if (!groupEmpty) {
            groups.set(tf, group);
        }
    }
    return groups;
}
