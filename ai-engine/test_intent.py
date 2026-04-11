from app.agent.intent_parser import parse_instruction, job_matches_intent

# LPA extraction tests
cases = [
    'apply to software engineering jobs above 10 lpa in bangalore',
    'find marketing roles more than 5 LPA',
    'sde roles above 15',
    'data science jobs above 8 lakhs',
    'hr jobs 600k salary',
    'apply to all jobs in mumbai',
]

for c in cases:
    r = parse_instruction(c)
    print('IN :', c)
    print('OUT: min_lpa={} field_keywords={} locations={}'.format(
        r['min_lpa'], r['field_keywords'], r['preferred_locations']
    ))
    print()

# job matching tests
job1 = {'title': 'Senior Backend Engineer', 'description': 'Python APIs', 'package_lpa': 12}
job2 = {'title': 'Marketing Manager', 'description': 'Growth and brand', 'package_lpa': 8}
job3 = {'title': 'Data Analyst', 'description': 'SQL and Excel', 'package_lpa': 4}

intent = parse_instruction('software engineering jobs above 10 lpa')

print('job_matches_intent (sde > 10 LPA):')
print('Backend engineer 12 LPA ->', job_matches_intent(job1, intent))
print('Marketing 8 LPA ->', job_matches_intent(job2, intent))
print('Data analyst 4 LPA ->', job_matches_intent(job3, intent))