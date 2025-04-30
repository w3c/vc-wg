import { GroupedData, getTFGroupedData, GroupedTFData } from "./lib/data.ts";
import { MiniDOM }                                      from './lib/minidom.ts';
import { directory, taskForces }                        from "./lib/params.ts";
import pretty                                           from "npm:pretty";
// Using the node:fs/promises module instead of Deno's built in i/o functions
// It makes it easier if someone wants to convert and this script in Node.js
import * as fs                                          from 'node:fs/promises';

/**
 * Generate the TOC HTML content.
 * 
 * @param document 
 * @param parent 
 * @param data 
 */
function tocHTML(document: MiniDOM, parent: Element, data: GroupedData, tf: string): boolean {
    if (data.size === 0) {
        // No data for this taskforce, so we skip it
        return false;
    }
    const section = document.addChild(parent, 'section');
    section.setAttribute('id', tf);
    const tfName = taskForces[tf] ?? `Unknown taskforce ${tf}`;
    const sectionTitle = `${tfName} meetings`;
    document.addChild(section, 'h2', sectionTitle);
    const ul = document.addChild(section, 'ul');
    let open_details = true;
    for (const [year, datum] of data) {
        const li_year = document.addChild(ul, 'li');
        document.addChild(li_year, 'h3', `Minutes in ${year}`);
        const details_year = document.addChild(li_year, 'details');
        if (open_details) {
            // This trick makes the minutes of the current year initially visible, the rest hidden
            open_details = false;
            details_year.setAttribute('open', 'true');
        }
        document.addChild(details_year, 'summary', 'List of Meetings');
        const ul_meetings = document.addChild(details_year, 'ul');

        for (const entry of datum) {
            const li_meeting = document.addChild(ul_meetings, 'li');
            document.addChild(li_meeting, 'h4', `<a target="_blank" href="${entry.location}">${entry.date.toDateString()}</a>`);
            const details_meeting = document.addChild(li_meeting, 'details');
            document.addChild(details_meeting, 'summary', 'Agenda');
            const ul_toc = document.addChild(details_meeting, 'ul');
            for (const em of entry.toc) {
                document.addChild(ul_toc, 'li', em)
            }
        }
    }

    // Add a TOC element to the section
    const slot = document.getElementById('toc');
    if (slot) {
        document.addChild(slot, 'li', `<a href="#${tf}">${sectionTitle}</a>`);
    }
    return true
}

/**
 * Generate the resolutions HTML content.
 * 
 * @param document 
 * @param parent 
 * @param data 
 */
function resolutionHTML(document: MiniDOM, parent: Element, data: GroupedData, tf: string): boolean {
    if (data.size === 0) {
        // No data for this taskforce, so we skip it
        return false;
    }
    const section = document.addChild(parent, 'section');
    section.setAttribute('id', tf);
    const sectionTitle = taskForces[tf] ?? `Unknown taskforce ${tf}`;
    document.addChild(section, 'h2', `${sectionTitle} resolutions`);
    const ul = document.addChild(section, 'ul');
    let noResolutions = true;
    for (const [year, datum] of data) {
        const li_year = document.addChild(ul, 'li');
        document.addChild(li_year, 'h3', `Resolutions in ${year}`);
        const ul_resolutions = document.addChild(li_year, 'ul');
        for (const entry of datum) {
            const date = entry.date.toDateString();
            for (const res of entry.res) {
                document.addChild(ul_resolutions, 'li',  `${res} (${date})`);
                noResolutions = false
            }
        }
    }
    if (noResolutions) {
        // It was all for nothing... Oh well
        section.parentElement?.removeChild(section);
        return false;
    } else {
        return true;
    }
}

/**
 * Generic wrapper function to generate content from a template.
 * 
 * @param data - The data to be inserted into the template
 * @param template_file - The template file name
 * @param id - The id of the slot in the template where the data should be inserted
 * @param output_file - Output file name
 * @param generationFunction - The content generation function
 */
async function generateContent(
        data: GroupedTFData, 
        template_file: string, 
        id: string, 
        output_file: string,
        emptyMessage: string = "No data available",
        generationFunction: (document: MiniDOM, parent: Element, data: GroupedData, tf: string) => boolean): Promise<void> {
    // get hold of the template file as a JSDOM
    const template = await fs.readFile(template_file, 'utf-8');

    // parse template into a DOM using JSDOM
    const document = new MiniDOM(template);

    const slot = document.getElementById(id);

    if (!slot) {
        throw new Error(`Could not find the right slot ${id} in the template`);
    }

    // Go through the taskforces and generate the content for each. Note the sorting of the task force names
    // to get a consistent order. The default and f2f are always first, the rest is sorted alphabetically.
    const tfList = Object.keys(taskForces).filter(tf => tf !== "default" && tf !== "f2f").sort();
    const results: boolean[] = ["default", "f2f", ...tfList].map((tf): boolean =>  {
        const tfData = data.get(tf);
        if (tfData !== undefined) {
            return generationFunction(document, slot, tfData, tf);
        } else {
            return false;
        }
    });

    // Display the empty message if no data was found for any of the taskforces
    if (!results.includes(true)) {
        document.addChild(slot, 'p', emptyMessage);
    }

    // Additional minor thing: set the copyright statement to the current year
    const cc = document.getElementById('year');
    if (cc) {
        cc.innerHTML = (new Date()).toISOString().split('-')[0];
    }

    // That is it: serialize the DOM back to a string
    const newRes = pretty(document.serialize());

    // Write the new index.html file
    await fs.writeFile(output_file, newRes);
}


/**
 * Main entry point to generate the HTML files.
 */
async function main(dir: string = directory) {
    // Get hold of the data to work on
    const tfData: GroupedTFData = await getTFGroupedData(dir);

    // Get the data into the HTML templates and write the files
    // The functions are async, so we need to wait for all of them to finish
    // hence this extra step with an array or promises
    const promises: Promise<void>[] = 
        [
            {
                template           : "./templates/index_template.html", 
                id                 : "list-of-calls", 
                output             : "index.html",
                emptyMessage       : "No meeting records available.", 
                generationFunction : tocHTML,
            },
            {
                template           : "./templates/resolutions_template.html", 
                id                 : "list-of-resolutions", 
                output             : "resolutions.html",
                emptyMessage       : "No resolutions have been taken.",  
                generationFunction : resolutionHTML,
            },
        ].map((entry) => generateContent(tfData, entry.template, entry.id, entry.output, entry.emptyMessage, entry.generationFunction));
    await Promise.allSettled(promises);
}

await main();
