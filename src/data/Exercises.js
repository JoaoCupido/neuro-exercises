import { Pencil, Waypoints, Zap, FileText, Camera } from "@lucide/astro";

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

    // Add more exercises later:
    // {
    //   id: "stroop",
    //   title: "Stroop Test",
    //   icon: Zap,
    //   path: "/stroop"
    // }
];
