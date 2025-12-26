'use server';
/**
 * @fileOverview A flow for generating personalized WhatsApp messages to tenants reminding them about upcoming rent payments.
 *
 * - generateRentReminder - A function that generates the rent reminder message.
 * - RentReminderInput - The input type for the generateRentReminder function.
 * - RentReminderOutput - The return type for the generateRentReminder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RentReminderInputSchema = z.object({
  tenantName: z.string().describe('The name of the tenant.'),
  propertyName: z.string().describe('The name of the property.'),
  rentAmount: z.number().describe('The amount of rent due.'),
  dueDate: z.string().describe('The due date for the rent payment (e.g., "15th July, 2024").'),
  phoneNumber: z.string().describe('The tenant phone number to send the reminder to'),
});
export type RentReminderInput = z.infer<typeof RentReminderInputSchema>;

const RentReminderOutputSchema = z.object({
  message: z.string().describe('The personalized WhatsApp message.'),
});
export type RentReminderOutput = z.infer<typeof RentReminderOutputSchema>;

export async function generateRentReminder(input: RentReminderInput): Promise<RentReminderOutput> {
  return generateRentReminderFlow(input);
}

const rentReminderPrompt = ai.definePrompt({
  name: 'rentReminderPrompt',
  input: {schema: RentReminderInputSchema},
  output: {schema: RentReminderOutputSchema},
  prompt: `Generate a polite and professional WhatsApp message to a tenant about their upcoming rent payment.

Here is the information:
- Tenant Name: {{tenantName}}
- Property: {{propertyName}}
- Rent Amount: K{{rentAmount}}
- Due Date: {{dueDate}}

The message should be friendly and clear. Start with "Dear {{tenantName}}," and end with "Thank you, Kabwata Shopping Complex Management".`,
});


const generateRentReminderFlow = ai.defineFlow(
  {
    name: 'generateRentReminderFlow',
    inputSchema: RentReminderInputSchema,
    outputSchema: RentReminderOutputSchema,
  },
  async input => {
    const {output} = await rentReminderPrompt(input);
    return output!;
  }
);
