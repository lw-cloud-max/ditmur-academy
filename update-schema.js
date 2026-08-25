const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!schema.includes('model Ticket')) {
  schema += `
model Ticket {
  id        String   @id @default(cuid())
  subject   String
  status    String   @default("OPEN")
  parentId  String
  parent    Parent   @relation(fields: [parentId], references: [id])
  messages  TicketMessage[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model TicketMessage {
  id        String   @id @default(cuid())
  body      String
  sender    String   
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}
`;

  // Add the relation field to Parent model
  schema = schema.replace('model Parent {', 'model Parent {\n  tickets   Ticket[]');
  fs.writeFileSync('prisma/schema.prisma', schema);
  console.log("Schema updated with Ticket models.");
} else {
  console.log("Schema already has Ticket models.");
}
