import { Pencil, Waypoints, Zap, FileText, Camera, Text, WholeWord } from "@lucide/astro";

/*
export interface Exercise {
    id: string;              // unique id ("drawing", "tmt")
    title: string;           // display name
    description?: string;    // optional
    icon: any;               // lucide icon
    path: string;            // URL path (Astro route)
    pathWithoutDot: string;  // URL path without relative dot
}
*/

export const exercisesList = [
    {
        id: "drawing",
        title: "Drawing",
        description: "Free-form drawing with customizable tools",
        icon: Pencil,
        path: "./drawing",
        pathWithoutDot: "/drawing"
    },

    {
        id: "tmt",
        title: "Trail Making Test",
        description: "Cognitive assessment connecting sequences",
        icon: Waypoints,
        path: "./tmt",
        pathWithoutDot: "/tmt"
    },

    {
        id: "camera",
        title: "Camera",
        description: "Real-time video analysis for object/emotion detection",
        icon: Camera,
        path: "./camera",
        pathWithoutDot: "/camera",
    },

    {
        id: "text-recognition",
        title: "Text Recognition",
        //description: "DEBUG",
        description: "Handwriting recognition for numbers, letters, and words",
        icon: WholeWord,
        path: "./text-recognition",
        pathWithoutDot: "/text-recognition"
    },

    // Add more exercises later:
    // {
    //   id: "stroop",
    //   title: "Stroop Test",
    //   description: "DEBUG",
    //   icon: Zap,
    //   path: "/stroop"
    // }
];
