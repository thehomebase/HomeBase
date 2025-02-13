
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlossaryPage() {
  const glossaryTerms = [
    { term: 'Adjustable-rate (ARM)', definition: 'An adjustable-rate mortgage or ARM has an interest rate that can change. Your monthly payments can go up or down with this type of mortgage.' },
    { term: 'Fixed-rate', definition: 'A fixed-rate mortgage has an interest rate that doesn\'t change for the entire loan term. Your monthly payments will stay the same with this type of mortgage.' },
    { term: 'Home equity', definition: 'Your home equity is your current home value minus what you owe in your mortgage.' },
    { term: 'Mortgage insurance', definition: 'If your down payment is less than 20 percent of your home\'s purchase price, you will need to pay for mortgage insurance. Mortgage insurance protects your lender from losing money if you default on your loan. Typically, Federal Housing Administration (FHA) and US Department of Agriculture (USDA) loans require mortgage insurance.' },
    { term: 'Home value', definition: 'Home value is the estimated amount your home is worth in the current market.' },
    { term: 'Monthly mortgage payment', definition: 'Your monthly mortgage payment has four components: principal, interest, taxes, and insurance.' },
    { term: 'Homeowners insurance', definition: 'Homeowners insurance is a type of property insurance. It protects you from damage to your home or possessions. Homeowners insurance also provides liability insurance if there are accidents in your home or on the property.' },
    { term: 'Loan amount', definition: 'The loan amount is the amount of money you plan to borrow from a lender.' },
    { term: 'Security deposit', definition: 'A security deposit is the amount of money you give to your landlord at the beginning of a lease. This deposit is usually equal to one month\'s rent and covers any damage the tenant causes to the property.' },
    { term: 'Earnest Money', definition: 'A deposit made to the seller showing the buyer\'s good faith in a real estate transaction. This money is typically held in escrow and goes toward the down payment at closing.' },
    { term: 'Option Fee', definition: 'A payment made to a seller in exchange for the right to terminate a contract during the option period. This fee is typically non-refundable.' },
    { term: 'Option Period', definition: 'A specified time period during which a buyer can terminate the contract for any reason and receive their earnest money back (though the option fee is typically non-refundable).' },
    { term: 'FHA', definition: 'Federal Housing Administration loans are government-backed mortgages designed for low-to-moderate income borrowers. They require lower minimum down payments and credit scores than conventional loans.' },
    { term: 'Conventional', definition: 'A conventional loan is a mortgage that is not backed by a government agency. These loans typically require higher credit scores and down payments than government-backed loans.' },
    { term: 'VA', definition: 'Veterans Affairs loans are government-backed mortgages for military service members, veterans, and eligible spouses. They often require no down payment and offer competitive rates.' }
  ];

  return (
    <main className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-8">Real Estate Glossary</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {glossaryTerms.map((item, index) => (
          <Card key={index} className="p-4">
            <CardHeader>
              <CardTitle className="text-lg">{item.term}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.definition}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
