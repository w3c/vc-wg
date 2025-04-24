/** Location of the minutes, relative to the location of the script itself */
export const directory = "../minutes";

/** Location of the minutes, relative to the final place of the generated HTML files */
export const location = "../minutes";

/** 
 * The title of the minutes files, depending on the file name. The convention
 * is to have the file name ending with a dash and the identifier of the meeting.
 * The values are the strings to generate the reference to the meeting (the "Meeting" word
 * is added automatically).
 * 
 * The "default" and "f2f" values are fixed, do not remove them.
 */
export const taskForces: { [key: string]: string; } = {
    "default" : "Working group",
    "f2f"     : "Group face to face",
};

