import { GoogleGenAI } from "@google/genai";
import { SimulationConfig } from "../types";

const SYSTEM_INSTRUCTION = `
You are a friendly and knowledgeable Physics Professor specializing in Computational Fluid Dynamics (CFD) and Soft Body simulations.
The user is interacting with a 2D Slime simulation that uses a "Particle Fluid" model, visualized with Metaballs (Iso-surface).
Instead of springs, this model uses:
1. Short-range Repulsion: Prevents particles from overlapping (acts like internal pressure).
2. Medium-range Attraction (Cohesion): Keeps particles together like a liquid droplet.
3. Viscosity (Damping): Resists motion, making the fluid "thick" or "runny".
The visualization uses an SVG filter ("Gooey Effect") to threshold blurred particles, creating a smooth envelope.
When answering, refer to the current simulation parameters.
Keep answers concise (under 3 paragraphs).
`;

export const getGeminiExplanation = async (
  prompt: string,
  config: SimulationConfig
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        return "Please set your API_KEY to ask the AI.";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Construct context string
    const context = `
    Current Simulation State:
    - Particle Count: ${config.particleCount}
    - Viscosity (Damping): ${config.damping}
    - Cohesion Strength: ${config.attractionStrength}
    - Internal Pressure (Repulsion): ${config.repulsionStrength}
    - Visualization Mode: ${config.renderMode}
    `;

    const fullPrompt = `${context}\n\nUser Question: ${prompt}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "I couldn't generate an explanation at the moment.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error communicating with the AI physics lab.";
  }
};
